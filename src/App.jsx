import { useState, useEffect } from 'react'
import vaccineData from './vaccine_data_enhanced.json'
import { Sun, Moon, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function App() {
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [selectedConditions, setSelectedConditions] = useState([])
  const [recommendations, setRecommendations] = useState(null)
  const [errors, setErrors] = useState({})
  
  // Step management: 'form' | 'history' | 'recommendations' | 'vaccine-request' | 'provider-alert' | 'location-info'
  const [currentStep, setCurrentStep] = useState('form')
  const [potentialVaccines, setPotentialVaccines] = useState([])
  const [vaccineHistory, setVaccineHistory] = useState({}) // { vaccineName: { received: boolean, date: string, doses: number } }
  const [vaccinePreferences, setVaccinePreferences] = useState({}) // { vaccineName: 'want' | 'unsure' | 'no' }
  const [outputMethod, setOutputMethod] = useState('') // 'print-kiosk' | 'print-discharge' | 'text-message'
  const [selectedVaccinesForRequest, setSelectedVaccinesForRequest] = useState([])
  const [phoneNumber, setPhoneNumber] = useState('')


  // NEW: location-finding state
  const [zip, setZip] = useState('')
  const [coords, setCoords] = useState(null)          // { lat, lng }
  const [locations, setLocations] = useState([])      // nearby sites
  const [loadingLocs, setLoadingLocs] = useState(false)
  const [locError, setLocError] = useState('')
  const [openLocationFor, setOpenLocationFor] = useState(null) // vaccine.name


  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true
    const savedMode = localStorage.getItem('darkMode')
    // If user has saved preference, use it; otherwise default to dark (true)
    const isDark = savedMode !== null ? savedMode === 'true' : true
    // Apply dark class immediately on mount
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    return isDark
  })






  // Apply dark mode class and save preference
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  // Toggle dark mode
  const toggleDarkMode = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
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

    // Instead of showing recommendations, show vaccine history questions first
    setPotentialVaccines(filteredVaccines)
    setCurrentStep('history')
    // Initialize vaccine history state
    const initialHistory = {}
    filteredVaccines.forEach(vaccine => {
      initialHistory[vaccine.name] = { received: false, date: '', doses: 0 }
    })
    setVaccineHistory(initialHistory)
  }

  // Helper function to extract required doses from recommendation text
  const getRequiredDoses = (recommendation) => {
    if (!recommendation) return 1
    
    // Look for patterns like "1 dose", "2 doses", "1 or more", "2 or more"
    const doseMatch = recommendation.match(/(\d+)\s*(?:or\s*more\s*)?dose/i)
    if (doseMatch) {
      return parseInt(doseMatch[1])
    }
    
    // If it says "annually" or "annual", it's typically 1 dose per year
    if (recommendation.toLowerCase().includes('annual')) {
      return 1
    }
    
    // Default to 1 dose if we can't determine
    return 1
  }

  const handleVaccineHistoryChange = (vaccineName, field, value) => {
    setVaccineHistory(prev => ({
      ...prev,
      [vaccineName]: {
        ...prev[vaccineName],
        [field]: field === 'doses' ? parseInt(value) || 0 : value
      }
    }))
  }

  const submitVaccineHistory = () => {
    // Filter vaccines: only show those that haven't been received or haven't completed required doses
    const finalRecommendations = potentialVaccines.filter(vaccine => {
      const history = vaccineHistory[vaccine.name]
      
      // If not received, show it
      if (!history?.received) {
        return true
      }
      
      // If received, check if they've completed all required doses
      const requiredDoses = getRequiredDoses(vaccine.recommendation)
      const receivedDoses = history.doses || 0
      
      // Show if they haven't received enough doses
      return receivedDoses < requiredDoses
    }).map(vaccine => {
      const history = vaccineHistory[vaccine.name]
      const requiredDoses = getRequiredDoses(vaccine.recommendation)
      const receivedDoses = history?.doses || 0
      
      return {
        ...vaccine,
        previouslyReceived: history?.received || false,
        lastReceivedDate: history?.date || null,
        dosesReceived: receivedDoses,
        requiredDoses: requiredDoses,
        needsMoreDoses: history?.received && receivedDoses < requiredDoses
      }
    })

    setRecommendations(finalRecommendations)
    setCurrentStep('recommendations')
  }

  // Determine if vaccine is available in ED (common ED vaccines: Flu, COVID-19, Tdap, Hepatitis B)
  const isVaccineAvailableInED = (vaccineName) => {
    const edVaccines = ['Influenza (Flu)', 'COVID-19', 'Tetanus, Diphtheria, Pertussis (Tdap)', 'Hepatitis B']
    return edVaccines.includes(vaccineName)
  }

  const handleVaccinePreference = (vaccineName, preference) => {
    setVaccinePreferences(prev => ({
      ...prev,
      [vaccineName]: preference
    }))
  }

  const proceedToVaccineRequest = () => {
    // Initialize preferences
    const initialPreferences = {}
    recommendations.forEach(vaccine => {
      initialPreferences[vaccine.name] = null // null = not answered yet
    })
    setVaccinePreferences(initialPreferences)
    setCurrentStep('vaccine-request')
  }

  const handleVaccineRequestSubmit = () => {
    const wantedVaccines = recommendations.filter(v => vaccinePreferences[v.name] === 'want')
    const unsureVaccines = recommendations.filter(v => vaccinePreferences[v.name] === 'unsure')
    const noVaccines = recommendations.filter(v => vaccinePreferences[v.name] === 'no')

    setSelectedVaccinesForRequest({
      wanted: wantedVaccines,
      unsure: unsureVaccines,
      no: noVaccines
    })

    // If they want any vaccines, check if any are ED-available
    if (wantedVaccines.length > 0) {
      const edAvailable = wantedVaccines.filter(v => isVaccineAvailableInED(v.name))
      const notEdAvailable = wantedVaccines.filter(v => !isVaccineAvailableInED(v.name))

      // If there are ED-available vaccines, show provider alert first
      if (edAvailable.length > 0) {
        setCurrentStep('provider-alert')
      } else {
        // Only non-ED vaccines wanted, go straight to location info
        setCurrentStep('location-info')
      }
    } else {
      // No vaccines wanted, but unsure or no responses - show location info
      setCurrentStep('location-info')
    }
  }

  const clearForm = () => {
    setAge('')
    setGender('')
    setSelectedConditions([])
    setRecommendations(null)
    setErrors({})
    setCurrentStep('form')
    setPotentialVaccines([])
    setVaccineHistory({})
    setVaccinePreferences({})
    setOutputMethod('')
    setSelectedVaccinesForRequest([])
    setPhoneNumber('')
  }

  // remove old geocodeZip and fetchNearbyVaccineSites that hit Google directly

  const fetchNearbyVaccineSites = async (zipCode) => {
    const res = await fetch(`/api/nearby-vaccines?zip=${encodeURIComponent(zipCode)}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Unable to fetch nearby locations')
    }
    const data = await res.json()
    return data.locations || []
  }

  const handleFindLocations = async (e) => {
    e.preventDefault()
    setLocError('')
    setLoadingLocs(true)

    try {
      const sites = await fetchNearbyVaccineSites(zip)
      setLocations(sites)
    } catch (err) {
      setLocError(err.message || 'Something went wrong.')
      setLocations([])
    } finally {
      setLoadingLocs(false)
    }
  }


  const printRecommendations = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground transition-colors">
      <header className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white py-8 px-4 shadow-md relative">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-semibold mb-2">GetVax</h1>
          <p className="text-lg mb-4 opacity-95">Get personalized vaccine recommendations based on your age, gender, and medical conditions/other indicators</p>
          <div className="bg-white/15 px-4 py-3 rounded-lg text-sm border-l-4 border-yellow-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>This tool provides general guidance based on CDC schedules. Always consult with your healthcare provider.</span>
            </div>
          </div>
          <button 
            onClick={toggleDarkMode} 
            className="absolute top-4 right-4 px-4 py-2 bg-white/20 border-2 border-white/30 rounded-lg text-sm font-medium text-white hover:bg-white/30 transition-all flex items-center justify-center gap-2 print:hidden cursor-pointer"
            aria-label="Toggle dark mode"
            type="button"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-[2500px] mx-auto grid grid-cols-[350px_1fr] gap-8 max-xl:grid-cols-1">
          <div className={`xl:sticky xl:top-8 xl:self-start print:hidden ${currentStep !== 'form' ? 'hidden xl:block' : ''}`}>
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">Your Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={getRecommendations}>
                  <div className="mb-6">
                    <Label htmlFor="age" className="mb-2 block">
                      Age <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Enter your age"
                      required
                      className={errors.age ? 'border-destructive' : ''}
                    />
                    {errors.age && <span className="block text-destructive text-sm mt-2">{errors.age}</span>}
                  </div>

                <div className="mb-6">
                  <Label className="mb-2 block">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-col gap-3 mt-2">
                    <label className="flex flex-row items-center gap-2 cursor-pointer px-3 py-3 border rounded-lg transition-all bg-background border-input hover:bg-accent hover:text-accent-foreground">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={gender === 'male'}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-5 h-5 min-w-[20px] min-h-[20px] cursor-pointer accent-primary flex-shrink-0"
                      />
                      <span className="inline-block leading-6">{gender === 'male' ? <strong className="text-primary">Male</strong> : 'Male'}</span>
                    </label>
                    <label className="flex flex-row items-center gap-2 cursor-pointer px-3 py-3 border rounded-lg transition-all bg-background border-input hover:bg-accent hover:text-accent-foreground">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={gender === 'female'}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-5 h-5 min-w-[20px] min-h-[20px] cursor-pointer accent-primary flex-shrink-0"
                      />
                      <span className="inline-block leading-6">{gender === 'female' ? <strong className="text-primary">Female</strong> : 'Female'}</span>
                    </label>
                    <label className="flex flex-row items-center gap-2 cursor-pointer px-3 py-3 border rounded-lg transition-all bg-background border-input hover:bg-accent hover:text-accent-foreground">
                      <input
                        type="radio"
                        name="gender"
                        value="other"
                        checked={gender === 'other'}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-5 h-5 min-w-[20px] min-h-[20px] cursor-pointer accent-primary flex-shrink-0"
                      />
                      <span className="inline-block leading-6">{gender === 'other' ? <strong className="text-primary">Other</strong> : 'Other'}</span>
                    </label>
                  </div>
                  {errors.gender && <span className="block text-destructive text-sm mt-2">{errors.gender}</span>}
                </div>

                <div className="mb-6">
                  <Label className="mb-2 block">Medical Conditions (Optional)</Label>
                  <CardDescription className="mb-3 mt-2">Select any that apply to get additional recommendations</CardDescription>
                  <div className="flex flex-col gap-2 max-h-[800px] overflow-y-auto p-2 border rounded-lg bg-muted">
                    {vaccineData.medical_conditions.map(condition => (
                      <label key={condition.id} className="flex flex-row items-center gap-2 cursor-pointer px-3 py-2 rounded-md transition-all bg-background hover:bg-accent">
                        <Checkbox
                          checked={selectedConditions.includes(condition.id)}
                          onChange={() => toggleCondition(condition.id)}
                          className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] flex-shrink-0"
                        />
                        <span className={`inline-block leading-6 whitespace-normal break-words ${selectedConditions.includes(condition.id) ? 'font-medium text-primary' : ''}`}>{condition.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 mt-8 justify-center">
                  <Button type="submit" className="flex-1 h-10" >
                    Continue to Vaccine History
                  </Button>
                  <Button type="button" onClick={clearForm} variant="secondary" className="flex-1 h-10">
                    Clear Form
                  </Button>
                </div>

                
                {/* NEW QR CODE SECTION */}
                <div className="mt-8 pt-8 border-t-2 border-slate-200 dark:border-slate-600 text-center max-md:hidden">
                  <h3 className="text-primary text-lg mb-2">Quick Mobile Access</h3>
                  <p className="text-sm text-muted-foreground mb-4">Scan to open on your phone</p>
                  <div className="bg-white p-4 rounded-xl inline-block shadow-md dark:shadow-lg">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://proto-getvax-v1.vercel.app/')}`}
                      alt="QR Code for mobile access"
                      className="block w-[180px] h-[180px] rounded-lg"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug max-w-[280px] mx-auto mt-4">
                    Point your phone's camera at the QR code to access this tool on mobile
                  </p>
                </div>


                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              {currentStep === 'form' && !recommendations && (
                <div className="text-center py-12 px-4 text-muted-foreground">
                  <svg className="w-20 h-20 mx-auto mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h2 className="text-muted-foreground mb-3">Enter Your Information</h2>
                  <p className="text-base leading-relaxed">Fill out the form on the left to see your personalized vaccine recommendations based on CDC guidelines.</p>
                </div>
              )}

              {currentStep === 'history' && potentialVaccines.length > 0 && (
                <div>
                  <CardHeader>
                    <CardTitle>Vaccine History</CardTitle>
                    <CardDescription>
                      Please let us know if you have received any of these vaccines previously. This helps us provide more accurate recommendations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {potentialVaccines.map((vaccine, index) => (
                        <div key={index} className="border-b pb-6 last:border-b-0 last:pb-0">
                          <div className="mb-4">
                            <h3 className="font-semibold text-lg mb-1">{vaccine.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{vaccine.description}</p>
                            <p className="text-sm text-muted-foreground mb-4">
                              <strong>Recommended:</strong> {vaccine.recommendation}
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                              <strong>Frequency:</strong> {vaccine.frequency}
                            </p>
                          </div>
                          
                          <div className="space-y-3">
                            <Label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={vaccineHistory[vaccine.name]?.received || false}
                                onChange={(e) => handleVaccineHistoryChange(vaccine.name, 'received', e.target.checked)}
                                className="w-5 h-5"
                              />
                              <span>Have you received this vaccine before?</span>
                            </Label>
                            
                            {vaccineHistory[vaccine.name]?.received && (
                              <div className="ml-7 space-y-3">
                                <div>
                                  <Label htmlFor={`doses-${index}`} className="mb-2 block">
                                    How many doses have you received? <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    id={`doses-${index}`}
                                    type="number"
                                    min="0"
                                    value={vaccineHistory[vaccine.name]?.doses || 1}
                                    onChange={(e) => handleVaccineHistoryChange(vaccine.name, 'doses', e.target.value)}
                                    className="max-w-xs"
                                    required
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Required: {getRequiredDoses(vaccine.recommendation)} dose{getRequiredDoses(vaccine.recommendation) > 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor={`date-${index}`} className="mb-2 block">
                                    When did you receive your last dose? (Optional)
                                  </Label>
                                  <Input
                                    id={`date-${index}`}
                                    type="date"
                                    value={vaccineHistory[vaccine.name]?.date || ''}
                                    onChange={(e) => handleVaccineHistoryChange(vaccine.name, 'date', e.target.value)}
                                    className="max-w-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex gap-4 mt-8">
                        <Button onClick={submitVaccineHistory} className="flex-1" >
                          Continue to Recommendations
                        </Button>
                        <Button onClick={() => setCurrentStep('form')} variant="secondary" className="flex-1">
                          Back to Form
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              )}

              {currentStep === 'recommendations' && recommendations && recommendations.length > 0 && (
                <div>
                  <div className="mb-6 ml-8 mt-8">
                    <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-md mb-6 max-w-2xl mx-auto">
                      <h3 className="font-semibold mb-2 text-lg text-primary">You can still get protected!</h3>
                      <p className="text-primary-dark">
                        If you have missed any vaccines, it's not too late. Most people can catch up easily! Pharmacies and clinics are here to help.  
                        Getting protected is fast, and you’ll feel better once it’s done.  
                        If you’re worried, talk with your doctor or pharmacist. They’re happy to answer your questions.
                      </p>
                    </div>
                  
                    <h2 className="text-2xl font-semibold text-primary mb-4">Vaccine Recommendations</h2>
                    <p className="text-muted-foreground text-lg mb-4">
                      For {age} year old {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      {selectedConditions.length > 0 && (
                        <span className="text-primary font-semibold"> with {selectedConditions.length} medical condition{selectedConditions.length > 1 ? 's' : ''}</span>
                      )}
                    </p>
                    <Button onClick={printRecommendations} variant="outline" size="sm" className="mb-4 print:hidden">
                      Print Recommendations
                    </Button>
                  </div>

                  <div className="mb-8">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[20%]">Vaccine Name</TableHead>
                          <TableHead className="w-[25%]">Description</TableHead>
                          <TableHead className="w-[40%]">Recommendation</TableHead>
                          <TableHead className="w-[15%]">Frequency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recommendations.map((vaccine, index) => (
                          <TableRow 
                            key={index} 
                            className={vaccine.name === 'COVID-19' || vaccine.name === 'Influenza (Flu)' ? 'bg-accent/10' : ''}
                          >
                            <TableCell className="align-top">
                              <div className="font-semibold text-primary flex flex-col gap-2 items-start">
                                <span>{vaccine.name}</span>
                                {vaccine.previouslyReceived && (
                                  <span className="text-xs text-muted-foreground">
                                    Received {vaccine.dosesReceived || 0} dose{(vaccine.dosesReceived || 0) > 1 ? 's' : ''}{vaccine.lastReceivedDate ? ` (last: ${new Date(vaccine.lastReceivedDate).toLocaleDateString()})` : ''}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top">{vaccine.description}</TableCell>
                            <TableCell className="align-top">
                              <div>
                                {vaccine.needsMoreDoses && (
                                  <div className="text-xs text-primary font-semibold block mb-2 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>You've received {vaccine.dosesReceived} of {vaccine.requiredDoses} required dose{vaccine.requiredDoses > 1 ? 's' : ''}. Additional dose{vaccine.requiredDoses - vaccine.dosesReceived > 1 ? 's' : ''} needed.</span>
                                  </div>
                                )}
                                {vaccine.previouslyReceived && !vaccine.needsMoreDoses && (
                                  <span className="text-xs text-muted-foreground block mb-2 italic">
                                    You've completed the required doses ({vaccine.dosesReceived} of {vaccine.requiredDoses}). {vaccine.frequency.includes('booster') || vaccine.frequency.includes('annual') ? 'You may need a booster or updated dose.' : 'Please consult with your healthcare provider about timing for next dose.'}
                                  </span>
                                )}
                                {vaccine.recommendation}
                              </div>
                              {vaccine.conditionRecommendations && vaccine.conditionRecommendations.length > 0 && (
                                <div className="mt-3 p-3 bg-muted rounded-md text-xs">
                                  {vaccine.conditionRecommendations.map((cr, idx) => (
                                    <div key={idx} className="py-1 leading-relaxed">
                                      <strong className="text-primary">{cr.condition}:</strong> {cr.recommendation}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="align-top">{vaccine.frequency}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-center mt-8 mb-8">
                    <Button onClick={proceedToVaccineRequest} size="lg" className="print:hidden" >
                      Choose vaccines to receive
                    </Button>
                  </div>
                </div>
              )}

              {/* Vaccine Request Step */}
              {currentStep === 'vaccine-request' && recommendations && (
                <div className="space-y-6">
                  <CardHeader>
                    <CardTitle>Vaccine Request</CardTitle>
                    <CardDescription>
                      Please let us know if you would like to receive any of the recommended vaccines.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {recommendations.map((vaccine, index) => {
                        const selectedPreference = vaccinePreferences[vaccine.name]
                        return (
                          <div 
                            key={index} 
                            className={`p-4 rounded-lg transition-all ${
                              selectedPreference 
                                ? selectedPreference === 'want' 
                                  ? 'border-2 border-primary bg-primary/5' 
                                  : selectedPreference === 'unsure'
                                  ? 'border-2 border-secondary bg-secondary/5'
                                  : 'border-2 border-muted-foreground bg-muted'
                                : 'border border-input'
                            }`}
                          >
                            <div className="font-semibold text-lg mb-4">{vaccine.name}</div>
                            <div className="flex flex-col sm:flex-row gap-4">
                              <Button
                                variant={selectedPreference === 'want' ? 'default' : 'outline'}
                                onClick={() => handleVaccinePreference(vaccine.name, 'want')}
                                className={`flex-1 transition-all ${
                                  selectedPreference === 'want' 
                                    ? 'ring-2 ring-primary ring-offset-2 scale-105' 
                                    : ''
                                }`}
                              >
                                {selectedPreference === 'want' && '✓ '}
                                Yes, I would like this vaccine
                              </Button>
                              <Button
                                variant={selectedPreference === 'unsure' ? 'default' : 'outline'}
                                onClick={() => handleVaccinePreference(vaccine.name, 'unsure')}
                                className={`flex-1 transition-all ${
                                  selectedPreference === 'unsure' 
                                    ? 'ring-2 ring-secondary ring-offset-2 scale-105' 
                                    : ''
                                }`}
                              >
                                {selectedPreference === 'unsure' && '✓ '}
                                I'm unsure
                              </Button>
                              <Button
                                variant={selectedPreference === 'no' ? 'default' : 'outline'}
                                onClick={() => handleVaccinePreference(vaccine.name, 'no')}
                                className={`flex-1 transition-all ${
                                  selectedPreference === 'no' 
                                    ? 'ring-2 ring-muted-foreground ring-offset-2 scale-105' 
                                    : ''
                                }`}
                              >
                                {selectedPreference === 'no' && '✓ '}
                                No, not at this time
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                      
                      <div className="flex gap-4 mt-8">
                        <Button onClick={() => setCurrentStep('recommendations')} variant="outline">
                          Back
                        </Button>
                        <Button 
                          onClick={handleVaccineRequestSubmit} 
                          disabled={Object.values(vaccinePreferences).some(pref => pref === null)}
                          className="flex-1"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              )}

              {/* Provider Alert Step (for ED-available vaccines) */}
              {currentStep === 'provider-alert' && selectedVaccinesForRequest.wanted && (
                <div className="space-y-6">
                  <CardHeader>
                    <CardTitle>Provider Notification</CardTitle>
                    <CardDescription>
                      Your healthcare provider has been notified about your vaccine requests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedVaccinesForRequest.wanted
                        .filter(v => isVaccineAvailableInED(v.name))
                        .map((vaccine, index) => (
                          <div key={index} className="p-4 bg-primary/10 border-l-4 border-primary rounded-lg">
                            <div className="font-semibold text-lg mb-2">{vaccine.name}</div>
                            <div className="text-sm text-muted-foreground mb-4">
                              {vaccine.description} - {vaccine.frequency}
                            </div>
                            <div className="bg-primary/5 dark:bg-primary/10 p-3 rounded border border-primary/30 dark:border-primary/50">
                              <strong className="text-primary dark:text-primary">Provider Alerted:</strong>
                              <p className="text-foreground mt-1">
                                Your healthcare provider has been notified that you would like to receive the {vaccine.name} vaccine. They will review your request and discuss it with you.
                              </p>
                            </div>
                          </div>
                        ))}
                      
                      {selectedVaccinesForRequest.wanted.some(v => !isVaccineAvailableInED(v.name)) && (
                        <div className="mt-6">
                          <Button onClick={() => setCurrentStep('location-info')} className="w-full">
                            Continue to Location Information
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex gap-4 mt-8">
                        <Button onClick={() => setCurrentStep('vaccine-request')} variant="outline">
                          Back
                        </Button>
                        {!selectedVaccinesForRequest.wanted.some(v => !isVaccineAvailableInED(v.name)) && (
                          <Button onClick={() => setCurrentStep('location-info')} className="flex-1">
                            Continue
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
              )}

              {/* Location Information Step */}
              {currentStep === 'location-info' && (
                <div className="space-y-6">
                  <CardHeader>
                    <CardTitle>Where to Get Your Vaccines</CardTitle>
                    <CardDescription>
                      {selectedVaccinesForRequest.wanted?.some(v => !isVaccineAvailableInED(v.name)) || 
                       selectedVaccinesForRequest.unsure?.length > 0 || 
                       selectedVaccinesForRequest.no?.length > 0
                        ? 'Find locations to receive your vaccines or get more information.'
                        : 'Find locations to receive vaccines if you change your mind.'}
                    </CardDescription>
                      
                        {/* NEW: ZIP search form */}
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="zip">ZIP code</Label>
                          <form onSubmit={handleFindLocations} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                            <Input
                              id="zip"
                              type="text"
                              inputMode="numeric"
                              maxLength={5}
                              value={zip}
                              onChange={(e) => setZip(e.target.value)}
                              placeholder="e.g., 94720"
                              className="max-w-xs"
                              required
                            />
                            <Button type="submit" className="sm:w-auto">
                              Find locations near me
                            </Button>
                          </form>
                          {loadingLocs && (
                            <p className="text-sm text-muted-foreground">
                              Searching for nearby pharmacies and clinics…
                            </p>
                          )}
                          {locError && (
                            <p className="text-sm text-destructive">
                              {locError}
                            </p>
                          )}
                          {locations.length === 0 && !loadingLocs && !locError && (
                            <p className="text-xs text-muted-foreground">
                              Enter your ZIP code to see nearby locations under each vaccine.
                            </p>
                          )}
                        </div>




                  </CardHeader>

                  <CardContent>
                    <div className="space-y-6">
                      {/* Show vaccines that need location info */}
                      {[
                        ...(selectedVaccinesForRequest.wanted?.filter(v => !isVaccineAvailableInED(v.name)) || []),
                        ...(selectedVaccinesForRequest.unsure || []),
                        ...(selectedVaccinesForRequest.no || [])
                      ].map((vaccine, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="font-semibold text-lg mb-3">{vaccine.name}</div>
                              <div className="space-y-3 text-sm">

                              {/* NEW: toggle + collapsible nearby locations */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={locations.length === 0}
                                onClick={() =>
                                  setOpenLocationFor(
                                    openLocationFor === vaccine.name ? null : vaccine.name
                                  )
                                }
                                className="px-0 text-primary"
                              >
                                {locations.length === 0
                                  ? 'Enter your ZIP above to see nearby locations'
                                  : openLocationFor === vaccine.name
                                  ? 'Hide nearby locations'
                                  : 'Show nearby locations near you'}
                              </Button>

                              {openLocationFor === vaccine.name && locations.length > 0 && (
                                <div className="mt-2 p-3 bg-muted rounded-md space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    Showing general vaccine providers near {zip}. Call ahead to confirm they offer {vaccine.name}.
                                  </p>
                                  <ul className="space-y-2">
                                    {locations.map((site) => (
                                      <li key={site.id} className="border-b last:border-b-0 pb-2 last:pb-0">
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">{site.name}</span>
                                          {site.rating && (
                                            <span className="text-xs text-muted-foreground">
                                              {site.rating.toFixed(1)}★
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {site.address}
                                        </div>
                                        <a
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                            `${site.name} ${site.address}`
                                          )}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs text-primary hover:underline"
                                        >
                                          Open in Maps
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Keep generic guidance below as fallback */}
                              <div>
                                <strong className="text-primary">Vaccine Clinics and Pharmacies:</strong>
                                <ul className="list-disc list-inside ml-2 mt-1 space-y-1 text-muted-foreground">
                                  <li>
                                    <a
                                      href="https://www.vaccines.gov/"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      vaccines.gov - Find vaccine locations near you
                                    </a>
                                  </li>
                                  <li>
                                    You can also search local pharmacies (CVS, Walgreens, Rite Aid) or your health system clinics.
                                  </li>
                                </ul>
                              </div>
                              <div>
                                <strong className="text-primary">Primary Care Provider:</strong>
                                <p className="text-muted-foreground ml-2 mt-1">
                                  Contact your primary care provider to schedule an appointment for {vaccine.name}.
                                </p>
                              </div>

                            </div>

                        </div>
                      ))}

                      {/* Output Method Selection */}
                      <div className="p bg-muted rounded-lg">
                        <div className="font-semibold mb-4">How would you like to receive this information?</div>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                            <input
                              type="radio"
                              name="outputMethod"
                              value="print-kiosk"
                              checked={outputMethod === 'print-kiosk'}
                              onChange={(e) => setOutputMethod(e.target.value)}
                              className="w-4 h-4"
                            />
                            <div>
                              <div className="font-medium">Print at Kiosk</div>
                              <div className="text-sm text-muted-foreground">Get a printed sheet directly from this kiosk</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                            <input
                              type="radio"
                              name="outputMethod"
                              value="print-discharge"
                              checked={outputMethod === 'print-discharge'}
                              onChange={(e) => setOutputMethod(e.target.value)}
                              className="w-4 h-4"
                            />
                            <div>
                              <div className="font-medium">Include in Discharge Instructions</div>
                              <div className="text-sm text-muted-foreground">Add this information to your discharge paperwork</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                            <input
                              type="radio"
                              name="outputMethod"
                              value="text-message"
                              checked={outputMethod === 'text-message'}
                              onChange={(e) => setOutputMethod(e.target.value)}
                              className="w-4 h-4"
                            />
                            <div>
                              <div className="font-medium">Text Message with Links</div>
                              <div className="text-sm text-muted-foreground">Receive a text message with links to vaccine locations</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Phone number input for text message */}
                      {outputMethod === 'text-message' && (
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="(555) 123-4567"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="max-w-xs"
                          />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-4 mt-8">
                        <Button 
                          onClick={() => {
                            if (selectedVaccinesForRequest.wanted?.some(v => isVaccineAvailableInED(v.name))) {
                              setCurrentStep('provider-alert')
                            } else {
                              setCurrentStep('vaccine-request')
                            }
                          }} 
                          variant="outline"
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={() => {
                            if (outputMethod === 'print-kiosk') {
                              window.print()
                            } else if (outputMethod === 'print-discharge') {
                              // In a real system, this would integrate with discharge system
                              alert('This information will be included in your discharge instructions.')
                            } else if (outputMethod === 'text-message') {
                              // In a real system, this would send SMS
                              alert('Text message with vaccine location links will be sent to your phone.')
                            }
                          }}
                          disabled={!outputMethod || (outputMethod === 'text-message' && !phoneNumber)}
                          className="flex-1"
                        >
                          {outputMethod === 'print-kiosk' ? 'Print Now' : 
                           outputMethod === 'print-discharge' ? 'Add to Discharge' : 
                           outputMethod === 'text-message' ? 'Send Text Message' : 
                           'Continue'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-secondary text-secondary-foreground py-8 px-4 text-center border-t border-border print:hidden">
        <p className="my-2">
          Data based on <a href="https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-age.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 no-underline hover:underline">CDC Immunization Schedule by Age</a> and 
          <a href="https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-medical-condition.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 no-underline hover:underline"> CDC Immunization Schedule by Medical Condition and Other Indications</a> 
        </p>
        <p className="my-2">Last updated: November 2025</p>
        <p className="text-sm opacity-80 mt-4">
          This tool is for educational purposes only and does not constitute medical advice.
        </p>
      </footer>
    </div>
  )
}

export default App
