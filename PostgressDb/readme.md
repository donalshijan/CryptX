First you need to access the container running the postgres db.
Then type in the following command to start using the postgres command line interface
  psql -U postgres

Then type \l to list all databases
Then type the following command to connect to database
\c cryptx

After that \dt should list all existing tables, but it won't because we are using a schema 

type \dn to list all schemas available on the current database

and always use schemaname.tablename while accessing tables in command and queries
so to list the all tables in the current schema

\dt schemaname.*

to get more details about the fields in the table
\d schemaname.tablename 

