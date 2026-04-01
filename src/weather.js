export async function fetchOpenWeatherForecast({ city, apiKey }) {
  const c = String(city || '').trim()
  const key = String(apiKey || '').trim()

  if (!c) throw new Error('City is required')
  if (c.length < 3) throw new Error('City name must be at least 3 characters')
  if (!/^[a-z\s'-]+$/i.test(c)) throw new Error('City name can only contain letters, spaces, hyphens, and apostrophes')
  if (!key) throw new Error('Missing VITE_OPENWEATHER_API_KEY (create client/.env)')

  const url = new URL('https://api.openweathermap.org/data/2.5/forecast')
  url.searchParams.set('q', c)
  url.searchParams.set('appid', key)
  url.searchParams.set('units', 'metric')

  const res = await fetch(url)
  const json = await res.json().catch(() => ({}))

  // Check HTTP status
  if (!res.ok) {
    const msg =
      typeof json?.message === 'string' ? json.message : `Request failed (${res.status})`
    throw new Error(msg)
  }

  // Validate API response code - MUST be "200" for success
  const cod = String(json.cod || '').trim()
  if (cod !== '200') {
    throw new Error('City not found')
  }

  // Ensure we have valid forecast data
  if (!json.list || !Array.isArray(json.list) || json.list.length === 0) {
    throw new Error('Invalid forecast data received')
  }

  return json
}

function buildDemoForecast(cityName) {
  const base = new Date()
  base.setHours(12, 0, 0, 0)

  const tempsByDay = [23, 27, 23, 25, 22, 25, 26]
  const popsByDay = [0.1, 0.1, 0.15, 0.7, 0.2, 0.15, 0.1]
  const condByDay = ['Cloudy', 'Cloudy', 'Cloudy', 'Rain', 'Cloudy', 'Cloudy', 'Cloudy']

  const list = []
  for (let day = 0; day < 7; day++) {
    for (let h = 0; h < 24; h += 3) {
      const d = new Date(base)
      d.setDate(base.getDate() + day)
      d.setHours(h, 0, 0, 0)

      const wobble = Math.sin((h / 24) * Math.PI * 2) * 1.2
      const temp = tempsByDay[day] + wobble
      const pop = popsByDay[day]
      const main = condByDay[day] === 'Rain' ? 'Rain' : 'Clouds'

      list.push({
        dt_txt: d.toISOString().slice(0, 19).replace('T', ' '),
        main: { temp },
        pop,
        weather: [{ main }],
      })
    }
  }

  return {
    city: { name: cityName || 'London' },
    list,
  }
}

