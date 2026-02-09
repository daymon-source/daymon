import { useState } from 'react'
import './StepInput.css'

function StepInput({ onAddSteps }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const n = value.replace(/,/g, '').trim()
    if (n && !Number.isNaN(Number(n))) {
      onAddSteps(Number(n))
      setValue('')
    }
  }

  return (
    <form className="step-input" onSubmit={handleSubmit}>
      <label htmlFor="steps" className="step-label">
        오늘 걸음수
      </label>
      <div className="step-row">
        <input
          id="steps"
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="step-field"
        />
        <button type="submit" className="step-submit">
          추가
        </button>
      </div>
    </form>
  )
}

export default StepInput
