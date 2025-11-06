# CDC Vaccine Recommendation Tool

A modern React + Vite web application that provides personalized vaccine recommendations based on CDC guidelines.

## Features

- Personalized vaccine recommendations based on age and gender
- CDC-compliant immunization schedule data
- Clean, responsive design
- Gender-specific vaccine notes
- Printable recommendations
- Form validation

## Setup Instructions

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd vaccine-recommender
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

2. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
vaccine-recommender/
├── public/              # Static assets
├── src/
│   ├── App.jsx         # Main application component
│   ├── App.css         # Application styles
│   ├── main.jsx        # Application entry point
│   ├── index.css       # Global styles
│   └── vaccine_data.json  # CDC vaccine data
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
└── README.md          # This file
```

## Vaccine Data

The application uses a JSON file (`vaccine_data.json`) containing CDC immunization schedule data for:

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
- Meningococcal (MenACWY)

## Customization

To update vaccine recommendations:

1. Edit `src/vaccine_data.json`
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

Based on CDC Immunization Schedules: https://www.cdc.gov/vaccines/schedules/
