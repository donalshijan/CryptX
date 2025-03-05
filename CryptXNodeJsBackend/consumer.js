const amqp = require('amqplib');
require('dotenv').config();
const OpenAI = require("openai");
const { updateUserVerificationStatus } = require('./db');
async function processImage(imageBuffer) {

            /**
             * TODO(developer): Uncomment these variables before running the sample.
             */
            const projectId = process.env.GOOGLE_PROJECT_ID;
            const location = 'us'; // Format is 'us' or 'eu'
            const processorId = process.env.GOOGLE_DOCUMENT_AI_IDPARCER_PROCESSOR_ID;
            // const filePath = '/path/to/local/pdf';

            const {DocumentProcessorServiceClient} =
            require('@google-cloud/documentai').v1;

            // Instantiates a client
            // apiEndpoint regions available: eu-documentai.googleapis.com, us-documentai.googleapis.com (Required if using eu based processor)
            // const client = new DocumentProcessorServiceClient({apiEndpoint: 'eu-documentai.googleapis.com'});
            const client = new DocumentProcessorServiceClient();

            async function quickstart() {
                console.log('Extracting info...')
            // The full resource name of the processor, e.g.:
            // projects/project-id/locations/location/processor/processor-id
            // You must create new processors in the Cloud Console first
            const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

            // Read the file into memory.
            // const fs = require('fs').promises;
            // const imageFile = await fs.readFile(filePath);

            // Convert the image data to a Buffer and base64 encode it.
            // const encodedImage = Buffer.from(imageFile).toString('base64');
            const encodedImage = imageBuffer.toString('base64');
            const request = {
            name,
            rawDocument: {
                content: encodedImage,
                mimeType: 'image/jpeg',
            },
            };

            // Recognizes text entities in the PDF document
            const [result] = await client.processDocument(request);
            const {document} = result;

            // Get all of the document text as one big string
            const {text} = document;

            // Extract shards from the text field
            const getText = textAnchor => {
            if (!textAnchor.textSegments || textAnchor.textSegments.length === 0) {
                return '';
            }

            // First shard in document doesn't have startIndex property
            const startIndex = textAnchor.textSegments[0].startIndex || 0;
            const endIndex = textAnchor.textSegments[0].endIndex;

            return text.substring(startIndex, endIndex);
            };

            // Read the text recognition output from the processor
            console.log('The document contains the following paragraphs:');
            const [page1] = document.pages;
            const {paragraphs} = page1;

            for (const paragraph of paragraphs) {
            const paragraphText = getText(paragraph.layout.textAnchor);
            console.log(`Paragraph text:\n${paragraphText}`);
            }
            }
            try {
                await quickstart();
            } catch (error) {
                console.error('Error in quickstart:', error);
            }
  }

const processMessage = async (msg,channel) => {
    try {
      // Decode the first layer of Buffer
    const firstDecodedMessage = Buffer.from(msg.content).toString();
    // Parse the first layer to get the nested Buffer as JSON
    const nestedBufferJSON = JSON.parse(firstDecodedMessage);

    // Decode the second layer of Buffer
    const messageContent = Buffer.from(nestedBufferJSON.data).toString();
    // Parse the actual message content
    const { metadata, image } = JSON.parse(messageContent);
      if (!metadata) {
        throw new Error('Metadata is undefined');
      }
      console.log('Received metadata message:', metadata);
  
      if (image) {
        const imageBuffer = Buffer.from(image, 'base64'); // Convert base64 string back to buffer
      await processImage(imageBuffer);
      }
  
      const { username, firstName, lastName, address } = metadata;
      
      console.log(`Processing user verification for ${username} with details:`, {
        firstName,
        lastName,
        address,
      });

      
            //send to open ai gpt to process the validity of extracted data and recieved data from user
            const openai = new  OpenAI(api_key=process.env.OPENAI_API_KEY)
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: "You are a helpful assistant." }],
                model: "gpt-3.5-turbo",
              });
            
              console.log(completion.choices[0]);
              // Assuming completion.choices[0].text contains the response from the GPT-3.5 model
                const response = completion.choices[0].text.trim();
               if (response === 'Match') {
                try {
                  // Update user's verification status to 'verified'
                  await updateUserVerificationStatus(username, 'verified');
                  console.log('User verified');
                } catch (error) {
                  console.error('Error updating user verification status:', error);
                }
              }
  
      channel.ack(msg);
    } catch (error) {
        console.error('Error processing message:', error);
    
        // Retrieve retry count from message properties
        const retryCount = msg.properties.headers['x-retry-count'] || 0;
    
        if (retryCount >= 3) { // Set your max retry count
            console.error(`Message failed after ${retryCount} attempts, discarding message`);
            channel.ack(msg); // Acknowledge the message to remove it from the queue
        } else {
          // Increment retry count and requeue message
          const newRetryCount = retryCount + 1;
          channel.nack(msg, false, false); // Nack without requeueing the original message
          channel.sendToQueue(msg.fields.routingKey, msg.content, {
            headers: { 'x-retry-count': newRetryCount }
          }); // Requeue with incremented retry count
        }
    }
  };

const startConsumer = async () => {
 let retries = 5; // Number of retries before giving up
  while (retries > 0) {
    try {
      console.log('Attempting to connect to RabbitMQ...');
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      const connection = await amqp.connect(rabbitmqUrl);
      const channel = await connection.createChannel();
      await channel.assertQueue('user_verification_queue');

      channel.consume('user_verification_queue', (msg) => processMessage(msg, channel), { noAck: false });

      console.log('Consumer connected and listening for messages');
      return channel;
    } catch (error) {
      console.error('Error starting consumer:', error);
      retries -= 1;
      if (retries > 0) {
        console.log(`Retrying in 10 seconds... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds before retrying
      } else {
        console.error('Failed to connect to RabbitMQ after multiple attempts');
        process.exit(1); // Exit the process with a failure code
      }
    }
  }
};

module.exports = startConsumer;
