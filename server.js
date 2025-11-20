// server.js
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 5000
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY

if (!GOOGLE_API_KEY) {
  console.error('Missing GOOGLE_MAPS_API_KEY in .env')
  process.exit(1)
}

app.use(cors())

// GET /api/nearby-vaccines?zip=94720
app.get('/api/nearby-vaccines', async (req, res) => {
  const { zip } = req.query

  if (!zip) {
    return res.status(400).json({ error: 'zip is required' })
  }

  try {
    // 1) Geocode ZIP
    const geoUrl =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        zip
      )}&key=${GOOGLE_API_KEY}`

    const geoRes = await fetch(geoUrl)
    const geoData = await geoRes.json()

    if (geoData.status !== 'OK' || !geoData.results[0]) {
      return res.status(400).json({ error: 'Unable to geocode ZIP' })
    }

    const { lat, lng } = geoData.results[0].geometry.location

    // 2) Nearby search for pharmacies with vaccines
    const radius = 8000 // ~5 miles
    const placesUrl =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${lat},${lng}&radius=${radius}&type=pharmacy&keyword=vaccine&key=${GOOGLE_API_KEY}`

    const placesRes = await fetch(placesUrl)
    const placesData = await placesRes.json()

    if (placesData.status !== 'OK') {
      return res
        .status(500)
        .json({ error: 'Places API error', details: placesData.status })
    }

    const locations = placesData.results.slice(0, 5).map((place) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
    }))

    res.json({ zip, lat, lng, locations })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
