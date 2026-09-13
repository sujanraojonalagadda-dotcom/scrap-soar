# ♻️ Kabadiwala Connect

### A Digital Platform Connecting Waste Collectors with Authorized Recyclers

Kabadiwala Connect is a smart waste-management platform designed to connect **waste collectors** with **authorized recycling organizations**.

The platform digitizes the complete waste-selling process — from collecting and listing waste to recycler purchase, location-based coordination, handover, transaction tracking, notifications, and digital receipts.

---

## 🌐 Live Demo

🔗 https://scrap-soar.vercel.app/

---

## 🎯 Problem Statement

The traditional waste collection and recycling process often depends on:

- Informal communication
- Limited access to verified recyclers
- Manual weight and transaction records
- Lack of price transparency
- Difficulty finding nearby recycling organizations
- No proper transaction history
- Limited traceability of collected waste

Kabadiwala Connect addresses these problems by providing a centralized digital platform.

---

## 💡 Our Solution

Kabadiwala Connect creates a digital connection between:

**Collector → Waste → Recycler → Transaction → Handover → Digital Receipt**

Collectors can list their collected waste, while authorized recyclers can discover available waste and purchase the materials they require.

The system also provides geographical location, real-time notifications, transaction tracking, and digital receipts.

---

## 👥 User Roles

The platform supports three roles:

### 🧑‍🔧 Collector

Collectors can:

- Register/login using mobile OTP
- Add collected waste
- Capture/upload waste photos
- Enter waste type and weight
- Add location information
- List waste for authorized recyclers
- View recycler purchase requests
- Accept or reject recycler requests
- View recycler organization details
- View recycler location on a map
- Get directions
- Track transactions
- Receive real-time notifications
- View complete transaction timelines
- Download digital transaction receipts

---

### ♻️ Recycler

Recyclers can:

- Register/login using mobile OTP
- Create organization profiles
- Add organization location
- Specify accepted waste categories
- View available waste
- View waste photos and details
- Purchase/accept required waste
- Send purchase requests to collectors
- Manage pickup/collection requests
- Confirm waste handover
- Confirm receipt of waste
- Track transactions
- Receive real-time notifications
- View transaction timelines
- Download digital receipts

---

### 🛡️ Admin

Administrators can:

- Manage collectors
- Manage recyclers
- Verify recycler organizations
- Approve/reject recycler registrations
- Monitor waste listings
- Monitor transactions
- Monitor system activity
- View reports and analytics
- Manage platform data

---

# 🔄 Transaction Workflow

The complete transaction follows:

```text
Collector
    ↓
Collects Waste
    ↓
Uploads Photo + Weight + Details
    ↓
Waste Listed
    ↓
Authorized Recyclers View Waste
    ↓
Recycler Requires Waste
    ↓
Recycler Buys / Accepts Waste
    ↓
Collector Receives Notification
    ↓
Collector Reviews Recycler
    ↓
Collector Accepts Sale
    ↓
Recycler Location Becomes Available
    ↓
Pickup / Handover
    ↓
Collector Confirms Handover
    ↓
Recycler Confirms Receipt
    ↓
Transaction Completed
    ↓
Full Transaction Timeline
    ↓
Digital PDF Receipt
🔔 Real-Time Notifications
The platform provides real-time notifications for important transaction events.
Examples:

New recycler purchase request
Purchase accepted
Purchase rejected
Pickup scheduled
Waste handed over
Recycler receipt confirmation
Transaction completed
Recycler verification approved
Users can see notifications directly from their dashboard without manually refreshing the application.
📍 Location & Maps
Kabadiwala Connect includes geographical functionality for connecting collectors and recyclers.
Collector
Collectors can:
Share/select their location
Find nearby authorized recyclers
View recycler distance
View recycler organization location
Open directions
Recycler
Recyclers can:
Add organization location
View relevant collection locations
Coordinate pickups
The platform uses geographical coordinates to calculate distance and support map-based navigation.
📊 Transaction Timeline
Every transaction maintains a complete history.
Example:

✓ Waste Listed
      ↓
✓ Purchase Requested
      ↓
✓ Sale Accepted
      ↓
✓ Pickup Scheduled
      ↓
✓ Waste Handed Over
      ↓
✓ Recycler Confirmed Receipt
      ↓
✓ Transaction Completed
Each event contains:
Event type
Event description
User who performed the action
Date
Time
This provides complete transaction traceability.
📄 Digital Receipt
After a transaction is completed, the system generates a digital transaction receipt.
The receipt contains:

Receipt number
Transaction ID
Collector details
Recycler organization details
Waste/material type
Initial weight
Final weight
Price per kg
Total transaction value
Handover information
Complete transaction timeline
Collector confirmation
Recycler confirmation
Completion status
The receipt can be viewed and downloaded as a PDF.
🔐 Role-Based Access
Each user only gets access to their authorized dashboard.
Collector
    ↓
Collector Dashboard ONLY

Recycler
    ↓
Recycler Dashboard ONLY

Admin
    ↓
Admin Dashboard ONLY
Users cannot access another role's dashboard by manually entering its URL.
Role-based authorization is enforced at the application/database level.

🔑 Authentication
The application uses mobile-number authentication with OTP.
Authentication flow:

Mobile Number
      ↓
OTP Sent
      ↓
OTP Verification
      ↓
User Authentication
      ↓
Role Detection
      ↓
Correct Dashboard
The login page does not require users to select Collector, Recycler, or Admin.
The system determines the user's role from their account.

🗄️ Data Model
Core entities include:
Users
│
├── Collectors
│
├── Recyclers
│
├── Waste Listings
│
├── Purchase Requests
│
├── Transactions
│
├── Transaction Events
│
└── Notifications
Main relationships
User
 ↓
Collector / Recycler
 ↓
Waste Listing
 ↓
Purchase Request
 ↓
Transaction
 ↓
Transaction Events
 ↓
Digital Receipt
🛠️ Technology Stack
The project is designed as a modern web application using technologies such as:
Frontend: React
Language: TypeScript
UI: Tailwind CSS
Backend/Data: Supabase
Authentication: Mobile OTP
Database: PostgreSQL
Maps & Location Services
Real-Time Notifications
PDF Receipt Generation
Deployment: Vercel
Update this section if the final implementation uses different libraries/services.
🚀 Getting Started
1. Clone the repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <PROJECT_FOLDER>
2. Install dependencies
npm install
3. Configure environment variables
Create:
.env
Add the required configuration values for the application.
Example:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
Add any additional authentication, map, or service-provider variables required by the final implementation.
4. Start development server
npm run dev
The application will be available locally.
🧪 Testing
Important scenarios to test:
Collector
 Register/login
 OTP verification
 Add waste
 Upload waste photo
 Enter weight
 Add location
 View recycler requests
 Accept/reject recycler
 View recycler location
 Get directions
 Confirm handover
 View transaction timeline
 Download receipt
Recycler
 Register/login
 OTP verification
 Complete organization profile
 Submit verification
 View available waste
 Purchase/accept waste
 Receive notifications
 Manage pickup
 Confirm receipt
 View transaction timeline
 Download receipt
Admin
 Login
 View users
 View recyclers
 Verify recycler
 Monitor waste listings
 Monitor transactions
 View system data
🔒 Security
The application should follow these security principles:
Role-based authorization
Database-level access control
Secure authentication
Protected transaction data
Protected user information
Restricted location sharing
No hardcoded production credentials
No hardcoded OTPs in production
Secure PDF/receipt access
Proper database Row Level Security
🌱 Future Enhancements
Potential future improvements include:
AI-based waste classification
Automatic waste-price estimation
QR-based transaction verification
Digital payment integration
Carbon-footprint calculation
Recycling impact dashboard
Pickup route optimization
Recycler ratings and reviews
Advanced analytics
Government/municipal integration
Reward points for collectors
Mobile application
📈 Project Impact
Kabadiwala Connect aims to improve the informal and formal recycling ecosystem by providing:
Transparency
Clear information about waste, buyers, pricing, and transactions.
Traceability
Every transaction can be tracked from listing to completion.
Accessibility
Collectors can discover multiple authorized recycling organizations.
Efficiency
Digital workflows reduce manual communication and record keeping.
Trust
Recycler verification and digital receipts provide stronger transaction confidence.
Sustainability
Better connections between waste collectors and recyclers can help increase proper waste recovery and recycling.
👨‍💻 Project
Kabadiwala Connect
A digital waste collection and recycling coordination platform.

Live Application
https://scrap-soar.vercel.app/
♻️ Connect. Recycle. Earn.
A cleaner today, a greener tomorrow.
