import './GaugeBar.css'

function GaugeBar({ label, value, maxValue = 100, color = 'default' }) {
  const percentage = Math.min((value / maxValue) * 100, 100)

  return (
    <div className="gauge-bar">
      <div className="gauge-label">{label}</div>
      <div className="gauge-container">
        <div className="gauge-track">
          <div
            className={`gauge-fill gauge-fill--${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default GaugeBar
