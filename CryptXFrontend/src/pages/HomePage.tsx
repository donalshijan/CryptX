import Orders from '../components/Orders.tsx'
import PortfolioGrowthChart from '../components/PortFolioGrowthChart.tsx'
import PortfolioDoughnut from '../components/PortfolioDoughnut.tsx'
const HomePage = () => {
  return (
    <>
        <div className='dashboard'>
          <div className='chartsSectionOfDashboard'>
          <PortfolioDoughnut/>
          <PortfolioGrowthChart/>
          </div>
        <div className='ordersSectionOfDashboard'>
          <Orders/>
        </div>
        </div>
        

    </>
  )
}

export default HomePage