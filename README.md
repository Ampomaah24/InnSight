Project Title:
InnSight: Leveraging Technology to Modernize Hotel Management and Elevate Guest Experience

Authors:
Brian Antwi  
Ohemaa Boakye  
Ashesi University, 2025

GitHub Repository:
https://github.com/Ampomaah24/InnSight

Overview:
InnSight is a hotel management platform developed for Ampomaah Hotel to reduce reliance on third-party booking platforms. The system features:

- Direct room and conference booking module
- AI-powered chatbot for bookings and inquiries
- Restaurant ordering system
- Admin dashboard for managing reservations, payments, and reports
- Mobile money integration via Paystack

How to run

1. Navigate to the frontend project directory:
   cd InnSight

2. Install dependencies:
   npm install

3. Set up environment variables in a `.env` file:

VITE_FIREBASE_API_KEY=AIzaSyCPhz0mpDjDPu7Ze7tdD8kOTimwEnW8SP4
VITE_FIREBASE_AUTH_DOMAIN=innsight-c575d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=innsight-c575d
VITE_FIREBASE_STORAGE_BUCKET=innsight-c575d.appspot.com 
VITE_FIREBASE_MESSAGING_SENDER_ID=148100251084
VITE_FIREBASE_APP_ID=1:148100251084:web:69ee2bbdb95543be82b169
VITE_FIREBASE_MEASUREMENT_ID=G-V1FK8H84H2
VITE_PAYSTACK_PUBLIC_KEY=pk_test_8b02dfc94aa31f78f2f3214086e81616365346c5
VITE_SENDGRID_API_KEY=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
   

4. Start the development server:
   npm run dev


5. Navigate to the chatbot project directory:
cd hotel-chatbot-api

6. Change the allowed origins in the FastAPI backend to match your frontend URLs.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Replace with your local development frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

7. Run the app file:
python -u app.py