# Get Vaccine Recommendations

A React + Vite web application that provides personalized vaccine recommendations based on CDC schedules.

## Features

- Personalized vaccine recommendations based on age and gender, and medical conditions/other indications
- CDC-compliant immunization schedule data
- Clean, responsive design
- Gender-specific vaccine notes
- Printable recommendations

## Setup Instructions

### Prerequisites

- Node.js (version 16 or higher)
- npm

### Installation

1. Navigate to the project directory:
   ```bash
   cd proto-getvax-v1
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the local link generated in the terminal:
   ```
   http://localhost:5173 (or similar)
   ```

## Project Structure

```
vaccine-recommender/
├── src/
│   ├── App.jsx         
│   ├── App.css        
│   ├── main.jsx        
│   ├── index.css       
│   └── vaccine_data_enhanced.json 
├── index.html          
├── package.json        
├── vite.config.js     
└── README.md         
```

## Vaccine Data

The application uses a JSON file (`vaccine_data_enhanced.json`) containing CDC immunization schedule data for:

- COVID-19
- Influenza (Flu)
- Tdap/Td (Tetanus, Diphtheria, Pertussis)
- MMR (Measles, Mumps, Rubella)
- Varicella (Chickenpox)
- Shingles (Zoster)
- HPV (Human Papillomavirus)
- Pneumococcal (PCV/PPSV)
- Hepatitis A
- Hepatitis B
- RSV (Respiratory Syncytial Virus)
- Meningococcal (MenACWY) and Meningococcal B (MenB)
- Haemophilus influenzae type b (Hib)
- Mpox

And for medical conditions/other indications like:

- Pregnancy
- Immunocompromised (excluding HIV)
- HIV infection (CD4 <15% or <200/mm³)
- HIV infection (CD4 ≥15% and ≥200/mm³)
- Men who have sex with men
- Asplenia or complement deficiency
- Heart or lung disease
- Kidney failure, ESRD, or on dialysis
- Chronic liver disease or alcoholism
- Diabetes
- Healthcare personnel


## Customization

To update vaccine recommendations:

1. Edit `src/vaccine_data_enhanced.json`
2. Follow the existing data structure
3. Restart the development server

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is for educational purposes only and does not constitute medical advice.

## Disclaimer

This tool provides general guidance based on CDC immunization schedules. Always consult with your healthcare provider for personalized medical advice.

## Data Source

Based on CDC Immunization Schedules: https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-age.html#table-age and https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-medical-condition.html
