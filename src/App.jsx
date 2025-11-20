import { useState, useEffect } from 'react'
import './App.css'
import vaccineData from './vaccine_data_enhanced.json'

function App() {
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [selectedConditions, setSelectedConditions] = useState([])
  const [recommendations, setRecommendations] = useState(null)
  const [errors, setErrors] = useState({})

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode')
    // If user has saved preference, use it; otherwise default to dark (true)
    return savedMode !== null ? savedMode === 'true' : true
  })


  // Add checkbox tracking state
  const [checkedVaccines, setCheckedVaccines] = useState({})

  // Add function to toggle checkboxes
  const toggleVaccineCheck = (vaccineName) => {
    setCheckedVaccines(prev => ({
      ...prev,
      [vaccineName]: !prev[vaccineName]
    }))
  }

  const toggleAllVaccines = () => {
    // Check if all are currently checked
    const allChecked = recommendations.every(vaccine => checkedVaccines[vaccine.name])
    
    if (allChecked) {
      // If all checked, clear all
      setCheckedVaccines({})
    } else {
      // If not all checked, check all
      const newChecked = {}
      recommendations.forEach(vaccine => {
        newChecked[vaccine.name] = true
      })
      setCheckedVaccines(newChecked)
    }
  }

  // Helper function to check if all are checked
  const areAllChecked = () => {
    if (!recommendations || recommendations.length === 0) return false
    return recommendations.every(vaccine => checkedVaccines[vaccine.name])
  }

  // Helper function for indeterminate state (some checked, not all)
  const areSomeChecked = () => {
    if (!recommendations || recommendations.length === 0) return false
    const checkedCount = recommendations.filter(vaccine => checkedVaccines[vaccine.name]).length
    return checkedCount > 0 && checkedCount < recommendations.length
  }




  // Apply dark mode class and save preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!age) {
      newErrors.age = 'Age is required'
    } else if (age < 0 || age > 120) {
      newErrors.age = 'Age must be between 0 and 120'
    }

    if (!gender) {
      newErrors.gender = 'Gender is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const toggleCondition = (conditionId) => {
    setSelectedConditions(prev => 
      prev.includes(conditionId)
        ? prev.filter(id => id !== conditionId)
        : [...prev, conditionId]
    )
  }

  const getRecommendations = (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const ageNum = parseInt(age)
    const allRecommendations = new Map()

    // First, get age-based recommendations
    vaccineData.vaccines.forEach(vaccine => {
      const ageGroup = vaccine.age_groups.find(group => 
        ageNum >= group.min && ageNum <= group.max
      )

      if (ageGroup) {
        allRecommendations.set(vaccine.name, {
          name: vaccine.name,
          description: vaccine.description,
          recommendation: ageGroup.recommendation,
          frequency: vaccine.frequency,
          source: 'age',
          priority: 'standard',
          genderNote: gender.toLowerCase() === 'female' && vaccine.gender_notes?.female 
            ? vaccine.gender_notes.female 
            : null
        })
      }
    })

    // Then, add or update with medical condition-based recommendations
    if (selectedConditions.length > 0) {
      vaccineData.vaccines.forEach(vaccine => {
        if (vaccine.medical_conditions) {
          selectedConditions.forEach(conditionId => {
            const conditionRec = vaccine.medical_conditions[conditionId]
            if (conditionRec) {
              const existing = allRecommendations.get(vaccine.name)
              const conditionLabel = vaccineData.medical_conditions.find(c => c.id === conditionId)?.label

              if (existing) {
                // Update existing recommendation
                if (!existing.conditionRecommendations) {
                  existing.conditionRecommendations = []
                }
                existing.conditionRecommendations.push({
                  condition: conditionLabel,
                  recommendation: conditionRec.recommendation,
                  priority: conditionRec.priority
                })
                // Update priority if higher
                if (conditionRec.priority === 'high' && existing.priority !== 'high') {
                  existing.priority = 'high'
                }
                if (conditionRec.priority === 'contraindicated') {
                  existing.priority = 'contraindicated'
                }
                if (conditionRec.priority === 'caution' && existing.priority === 'standard') {
                  existing.priority = 'caution'
                }
              } else {
                // Add new recommendation based on condition only
                allRecommendations.set(vaccine.name, {
                  name: vaccine.name,
                  description: vaccine.description,
                  recommendation: conditionRec.recommendation,
                  frequency: vaccine.frequency,
                  source: 'condition',
                  priority: conditionRec.priority,
                  conditionRecommendations: [{
                    condition: conditionLabel,
                    recommendation: conditionRec.recommendation,
                    priority: conditionRec.priority
                  }],
                  genderNote: gender.toLowerCase() === 'female' && vaccine.gender_notes?.female 
                    ? vaccine.gender_notes.female 
                    : null
                })
              }
            }
          })
        }
      })
    }

    // Convert to array and sort
    const filteredVaccines = Array.from(allRecommendations.values())
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { high: 0, standard: 1, caution: 2, contraindicated: 3 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        // Then by name, with COVID-19 and Flu first
        if (a.name === 'COVID-19') return -1
        if (b.name === 'COVID-19') return 1
        if (a.name === 'Influenza (Flu)') return -1
        if (b.name === 'Influenza (Flu)') return 1
        return a.name.localeCompare(b.name)
      })

    setRecommendations(filteredVaccines)
  }

  const clearForm = () => {
    setAge('')
    setGender('')
    setSelectedConditions([])
    setRecommendations(null)
    setErrors({})
    setCheckedVaccines({})  
  }


  const printRecommendations = () => {
    window.print()
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>GetVax</h1>
          <p className="subtitle">Get personalized vaccine recommendations based on your age, gender, and medical conditions/other indicators</p>
          <p className="disclaimer">
            ⚠️ This tool provides general guidance based on CDC schedules. Always consult with your healthcare provider.
          </p>
          <button 
            onClick={toggleDarkMode} 
            className="dark-mode-toggle"
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="content-wrapper">
          <div className="form-section">
            <div className="card">
              <h2>Your Information</h2>
              <form onSubmit={getRecommendations}>
                <div className="form-group">
                  <label htmlFor="age">Age *</label>
                  <input
                    id="age"
                    type="number"
                    min="0"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age"
                    className={errors.age ? 'error' : ''}
                  />
                  {errors.age && <span className="error-message">{errors.age}</span>}
                </div>

                <div className="form-group">
                  <label>Gender *</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={gender === 'male'}
                        onChange={(e) => setGender(e.target.value)}
                      />
                      <span>Male</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={gender === 'female'}
                        onChange={(e) => setGender(e.target.value)}
                      />
                      <span>Female</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="gender"
                        value="other"
                        checked={gender === 'other'}
                        onChange={(e) => setGender(e.target.value)}
                      />
                      <span>Other</span>
                    </label>
                  </div>
                  {errors.gender && <span className="error-message">{errors.gender}</span>}
                </div>

                <div className="form-group">
                  <label>Medical Conditions (Optional)</label>
                  <p className="field-description">Select any that apply to get additional recommendations</p>
                  <div className="checkbox-group">
                    {vaccineData.medical_conditions.map(condition => (
                      <label key={condition.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedConditions.includes(condition.id)}
                          onChange={() => toggleCondition(condition.id)}
                        />
                        <span>{condition.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="button-group">
                  <button type="submit" className="btn btn-primary">
                    Get Recommendations
                  </button>
                  <button type="button" onClick={clearForm} className="btn btn-secondary">
                    Clear Form
                  </button>
                </div>

                
                {/* NEW QR CODE SECTION */}
                <div className="qr-code-section">
                  <h3>Quick Mobile Access</h3>
                  <p className="qr-description">Scan to open on your phone</p>
                  <div className="qr-code-container">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://proto-getvax-v1.vercel.app/')}`}
                      alt="QR Code for mobile access"
                      className="qr-code-image"
                      loading="lazy"
                    />
                  </div>
                  <p className="qr-note">
                    Point your phone's camera at the QR code to access this tool on mobile
                  </p>
                </div>


              </form>
            </div>
          </div>

          <div className="results-section">
            <div className="card">
              {!recommendations ? (
                <div className="placeholder">
                  <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h2>Enter Your Information</h2>
                  <p>Fill out the form on the left to see your personalized vaccine recommendations based on CDC guidelines.</p>
                </div>
              ) : (
                <div className="results">
                  <div className="results-header">
                    <h2>Vaccine Recommendations</h2>
                    <p className="results-subtitle">
                      For {age} year old {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      {selectedConditions.length > 0 && (
                        <span className="condition-count"> with {selectedConditions.length} medical condition{selectedConditions.length > 1 ? 's' : ''}</span>
                      )}
                    </p>
                    <button onClick={printRecommendations} className="btn btn-print">
                      Print Recommendations
                    </button>
                  </div>

                  <div className="completion-status">
                    <strong>Vaccination Status: </strong> 
                    {Object.values(checkedVaccines).filter(Boolean).length} of {recommendations.length} completed
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{
                          width: `${(Object.values(checkedVaccines).filter(Boolean).length / recommendations.length) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <table className="vaccine-table">
                      <thead>
                        <tr>
                          <th>Vaccine Name</th>
                          <th>Description</th>
                          <th>Recommendation</th>
                          <th>Frequency</th>

                          <th className="checkbox-header">
                            {/* <span>Completed</span> */}
                            <label className="master-checkbox-label">
                              <input
                                type="checkbox"
                                className="master-checkbox"
                                checked={areAllChecked()}
                                ref={(el) => {
                                  if (el) el.indeterminate = areSomeChecked()
                                }}
                                onChange={toggleAllVaccines}
                                aria-label="Toggle all vaccines"
                              />
                            </label>
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {recommendations.map((vaccine, index) => (
                          <tr 
                            key={index} 
                            className={vaccine.name === 'COVID-19' || vaccine.name === 'Influenza (Flu)' ? 'highlighted' : ''}
                          >
                            <td className="vaccine-name">
                              <span className={checkedVaccines[vaccine.name] ? 'vaccine-checked' : ''}>
                                {vaccine.name}
                              </span>
                            </td>


                            <td>{vaccine.description}</td>
                            <td>
                              <div>{vaccine.recommendation}</div>
                              {vaccine.conditionRecommendations && vaccine.conditionRecommendations.length > 0 && (
                                <div className="condition-notes">
                                  {vaccine.conditionRecommendations.map((cr, idx) => (
                                    <div key={idx} className="condition-note">
                                      <strong>{cr.condition}:</strong> {cr.recommendation}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td>{vaccine.frequency}</td>
                            <td className="checkbox-cell">
                              <input
                                type="checkbox"
                                id={`vaccine-${index}`}
                                className="vaccine-checkbox"
                                checked={checkedVaccines[vaccine.name] || false}
                                onChange={() => toggleVaccineCheck(vaccine.name)}
                                aria-label={`Mark ${vaccine.name} as completed`}
                              />
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(recommendations.some(v => v.genderNote) || recommendations.some(v => v.priority === 'contraindicated')) && (
                    <div className="special-notes">
                      <h3>⚠️ Important Notes</h3>
                      <ul>
                        {recommendations
                          .filter(v => v.priority === 'contraindicated')
                          .map((vaccine, index) => (
                            <li key={`contra-${index}`} className="contraindication-note">
                              <strong>{vaccine.name}:</strong> This vaccine is contraindicated for your selected condition(s). 
                              Do not receive this vaccine without consulting your healthcare provider.
                            </li>
                          ))}
                        {recommendations
                          .filter(v => v.genderNote)
                          .map((vaccine, index) => (
                            <li key={`gender-${index}`}>
                              <strong>{vaccine.name}:</strong> {vaccine.genderNote}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  <div className="info-box">
                    <strong>Important:</strong> These recommendations are based on CDC guidelines for routine vaccinations
                    {selectedConditions.length > 0 && ' and your selected medical condition(s)'}. 
                    Your healthcare provider may recommend additional vaccines or modified schedules based on your complete medical history, 
                    travel plans, occupation, or other risk factors. Always consult with your healthcare provider before making vaccination decisions.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>
          Data based on <a href="https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-age.html" target="_blank" rel="noopener noreferrer">CDC Immunization Schedule by Age</a> and 
          <a href="https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-medical-condition.html" target="_blank" rel="noopener noreferrer"> CDC Immunization Schedule by Medical Condition and Other Indications</a> 
        </p>
        <p>Last updated: November 2025</p>
        <p className="footer-disclaimer">
          This tool is for educational purposes only and does not constitute medical advice.
        </p>
      </footer>
    </div>
  )
}

export default App
