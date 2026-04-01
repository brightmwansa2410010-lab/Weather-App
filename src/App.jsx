import { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import './App.css'
import { fetchOpenWeatherForecast } from './weather'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

function toWeekdayLabel(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

function toWeekdayName(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'long' })
}

function processForecast(data) {
  const daily = {}

  for (const item of data?.list ?? []) {
    const date = item.dt_txt?.split(' ')?.[0]
    if (!date) continue
    if (!daily[date]) daily[date] = { temps: [], pops: [] }
    if (typeof item?.main?.temp === 'number') daily[date].temps.push(item.main.temp)
    if (typeof item?.pop === 'number') daily[date].pops.push(item.pop)
  }

  return Object.keys(daily)
    .sort()
    .slice(0, 7)
    .map((date) => {
      const temps = daily[date].temps
      const pops = daily[date].pops
      const avgTemp =
        temps.length === 0 ? null : temps.reduce((a, b) => a + b, 0) / temps.length
      const avgPop =
        pops.length === 0 ? null : pops.reduce((a, b) => a + b, 0) / pops.length
      return { date, temp: avgTemp, pop: avgPop }
    })
}

function generateInsight(days) {
  if (!days?.length) return null

  const rainy = days.find((d) => typeof d.pop === 'number' && d.pop > 0.6)
  if (rainy) return `Rain expected on ${toWeekdayName(rainy.date)}`

  const hot = days.find((d) => typeof d.temp === 'number' && d.temp > 35)
  if (hot) return `Very hot day expected on ${toWeekdayName(hot.date)} (${Math.round(hot.temp)}°C)`

  const cold = days.find((d) => typeof d.temp === 'number' && d.temp < 5)
  if (cold) return `Very cold day expected on ${toWeekdayName(cold.date)} (${Math.round(cold.temp)}°C)`

  const candidates = days
    .filter((d) => typeof d.temp === 'number')
    .map((d) => ({
      ...d,
      score:
        Math.abs(d.temp - 22) + (typeof d.pop === 'number' ? d.pop * 10 : 0),
    }))
    .sort((a, b) => a.score - b.score)

  const best = candidates[0]
  if (!best) return null
  return `Best day to go out: ${toWeekdayName(best.date)} (${Math.round(best.temp)}°C)`
}

export default function App() {
  const [city, setCity] = useState('London')
  const [query, setQuery] = useState('London')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [raw, setRaw] = useState(null)
  const apiKey = String(import.meta.env.VITE_OPENWEATHER_API_KEY || '').trim()

  const days = useMemo(() => processForecast(raw), [raw])
  const insight = useMemo(() => generateInsight(days), [days])

  const current = raw?.list?.[0]
  const currentTemp =
    typeof current?.main?.temp === 'number' ? Math.round(current.main.temp) : null
  const currentCondition = current?.weather?.[0]?.main ?? null

  const chartData = useMemo(() => {
    const labels = days.map((d) => toWeekdayLabel(d.date))
    const temps = days.map((d) => (typeof d.temp === 'number' ? Number(d.temp.toFixed(1)) : null))
    return {
      labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temps,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          pointBackgroundColor: '#00d4ff',
          pointBorderColor: '#0099cc',
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true,
          borderWidth: 2,
        },
      ],
    }
  }, [days])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { 
          grid: { display: false }, 
          ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 13, weight: '500' } } 
        },
        y: {
          grid: { color: 'rgba(0, 212, 255, 0.1)' },
          ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 13, weight: '500' } },
          title: { 
            display: true, 
            text: 'Temperature (°C)', 
            color: 'rgba(255, 255, 255, 0.7)', 
            font: { size: 13, weight: '600' } 
          },
        },
      },
    }),
    [],
  )

  async function onSearch(e) {
    e?.preventDefault?.()
    const next = query.trim()
    if (!next) {
      setError('Please enter a city name')
      return
    }
    if (next.length < 3) {
      setError('City name must be at least 3 characters')
      return
    }

    setCity(next)
    setLoading(true)
    setError('')
    setRaw(null)

    try {
      const data = await fetchOpenWeatherForecast({ city: next, apiKey })
      setRaw(data)
    } catch (err) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load the default city on first render
    onSearch({ preventDefault: () => {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page">
      <form className="headerSection" onSubmit={onSearch}>
        <div className="headerTop">
          <h1 className="appTitle">Weather</h1>
          <div className="searchContainer">
            <input
              id="city"
              className="searchInput"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city..."
              autoComplete="off"
            />
            <button className="searchButton" type="submit" disabled={loading} aria-label="Search">
              🔍
            </button>
          </div>
        </div>
        {error && <div className="errorBanner">{error}</div>}
      </form>

      <div className="content">
        {/* Main Weather Card */}
        <div className="mainWeatherCard">
          <div className="locationInfo">
            <h2 className="cityName">{city || '—'}</h2>
            <p className="timestamp">Today</p>
          </div>

          {currentCondition && (
            <div className="weatherIcon">
              {currentCondition === 'Rain' && '🌧️'}
              {currentCondition === 'Clouds' && '☁️'}
              {currentCondition === 'Clear' && '☀️'}
              {currentCondition === 'Snow' && '❄️'}
              {currentCondition === 'Thunderstorm' && '⛈️'}
              {currentCondition === 'Drizzle' && '🌦️'}
              {currentCondition === 'Mist' || currentCondition === 'Smoke' ? '🌫️' : ''}
              {!['Rain', 'Clouds', 'Clear', 'Snow', 'Thunderstorm', 'Drizzle', 'Mist', 'Smoke'].includes(currentCondition) && '🌤️'}
            </div>
          )}

          <div className="temperatureDisplay">
            <span className="tempValue">{currentTemp == null ? '—' : `${currentTemp}°`}</span>
            <div className="conditionText">
              <p>{currentCondition == null ? '—' : currentCondition}</p>
              {loading && <p className="loadingText">Updating...</p>}
            </div>
          </div>

          <div className="weatherDetails">
            <div className="detailItem">
              <span className="detailLabel">Condition</span>
              <span className="detailValue">{currentCondition || '—'}</span>
            </div>
            <div className="detailsDivider"></div>
            <div className="detailItem">
              <span className="detailLabel">Humidity</span>
              <span className="detailValue">{current?.main?.humidity ?? '—'}%</span>
            </div>
            <div className="detailsDivider"></div>
            <div className="detailItem">
              <span className="detailLabel">Wind</span>
              <span className="detailValue">{current?.wind?.speed ?? '—'} m/s</span>
            </div>
          </div>
        </div>

        {/* Insight Section */}
        {insight && (
          <div className="insightCard">
            <div className="insightIcon">💡</div>
            <div className="insightContent">
              <h3 className="insightTitle">Insight</h3>
              <p className="insightText">{insight}</p>
            </div>
          </div>
        )}

        {/* 7-Day Forecast Chart */}
        <div className="forecastSection">
          <h3 className="sectionTitle">7-Day Forecast</h3>
          <div className="trendChart">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}
