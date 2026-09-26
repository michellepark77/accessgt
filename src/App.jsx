import { useState } from 'react'
import './App.css'

function App() {
  const [start, setStart] = useState('')
  const [destination, setDestination] = useState('')
  const [avoidStairs, setAvoidStairs] = useState(true)
  const [message, setMessage] = useState('')

  function handleFindRoute(event) {
    event.preventDefault()
    setMessage(
      'Your selections are ready. Route results will appear once the map is connected.'
    )
  }

  return (
    <div className="accessgt-app">
      <header className="app-header">
        <a className="brand" href="/">AccessGT</a>
        <span>Campus navigation, with access in mind.</span>
      </header>

      <main className="app-layout">
        <aside className="sidebar">
          <p className="eyebrow">GEORGIA TECH</p>
          <h1>Find your way.</h1>
          <p className="intro">
            Plan your trip around campus with your access needs in mind.
          </p>

          <form onSubmit={handleFindRoute}>
            <label htmlFor="start">Starting point</label>
            <input
              id="start"
              type="text"
              placeholder="Enter a building or location"
              value={start}
              onChange={(event) => {
                setStart(event.target.value)
                setMessage('')
              }}
              required
            />

            <label htmlFor="destination">Destination</label>
            <input
              id="destination"
              type="text"
              placeholder="Where are you going?"
              value={destination}
              onChange={(event) => {
                setDestination(event.target.value)
                setMessage('')
              }}
              required
            />

            <fieldset className="preferences">
              <legend>Route preferences</legend>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={avoidStairs}
                  onChange={(event) => {
                    setAvoidStairs(event.target.checked)
                    setMessage('')
                  }}
                />
                Avoid stairs
              </label>
            </fieldset>

            <button className="primary-button" type="submit">
              Find route
            </button>
          </form>

          <section className="route-summary" aria-live="polite">
            <h2>Your route</h2>
            <p>
              {message ||
                'Choose a starting point and destination to get started.'}
            </p>
          </section>
        </aside>

        <section className="map-panel" aria-label="Campus map">
          {/* Your teammate's map component will go here. */}
            <iframe
              title="Georgia Tech accessibility map — demo reports"
              src="/index.html"
              style={{
                width: '100%',
                height: '600px',
                border: 'none',
                display: 'block',
              }}
            />
          <div className="map-legend" aria-label="Map legend">
            <span>🚪 Accessible entrance</span>
            <span>↗ Ramp</span>
            <span>🚧 Reported barrier</span>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App