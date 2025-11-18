# 🎯 Goal Tracker - AI-Powered Goal Validation & Progress Tracking

A modern web application that helps users set, validate, and track their goals using AI-powered validation to ensure goals are challenging, measurable, and achievable.

## ✨ Features

### 🔐 User Authentication
- **User Registration**: Create new accounts with username, email, and password
- **Secure Login**: Session-based authentication with persistent login
- **Session Management**: Automatic session handling and logout functionality

### 🤖 AI-Powered Goal Validation
- **Intelligent Assessment**: Uses Claude AI to validate goal difficulty and measurability
- **Difficulty Analysis**: Ensures goals require at least 2 hours of work (longer goals are welcome!)
- **Measurability Check**: Validates that goals have clear, specific success criteria
- **Smart Clarifying Questions**: AI asks questions about unfamiliar platforms, tools, or concepts
- **Interactive Learning**: You can teach the AI about platforms it doesn't know
- **Context Memory**: AI remembers your explanations and won't ask about the same terms again
- **Smart Feedback**: Provides detailed feedback and suggestions for improvement

### ⭐ XP Tracking System
- **XP Goal Support**: Special handling for XP-based goals (1 XP = ~1.5 minutes)
- **Screenshot Verification**: Mandatory screenshot upload for XP-related goals
- **Flexible Requirements**: Considers XP alongside other activities - goals can combine XP earning with additional meaningful work
- **Visual Proof**: Display uploaded screenshots with modal viewing

### 📊 Goal Management
- **Goal Submission**: Submit goals with optional XP amounts and screenshots
- **Progress Tracking**: Track active and completed goals
- **Goal Completion**: Mark goals as completed with timestamps
- **Goal History**: View all submitted goals with creation and completion dates
- **Personal Context**: AI builds a personal knowledge base from your answers to clarifying questions

### 🎨 Modern UI/UX
- **Beautiful Design**: Modern dark theme with gradient accents
- **Responsive Layout**: Works perfectly on desktop and mobile devices
- **Smooth Animations**: Engaging animations and transitions
- **Intuitive Interface**: Clean, user-friendly design with clear navigation

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Austin-Way/Afterschool1.git
   cd Afterschool1
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup environment**:
   ```bash
   cp env.example .env
   # Add your Claude API key to .env
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

### 🌐 Deploy to Vercel

This application is optimized for Vercel deployment:

1. **Fork/Clone the repository**
2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variable: `CLAUDE_API_KEY`
3. **Deploy**: Vercel will automatically deploy your app!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Austin-Way/Afterschool1.git)

## 🔧 Configuration

The application uses a Claude AI API key for goal validation. The key is currently embedded in the server code for simplicity, but in production, it should be moved to environment variables.

### Environment Variables (Optional)
Create a `.env` file in the root directory:
```env
CLAUDE_API_KEY=your-anthropic-api-key-here
PORT=3000
```

## 📖 How to Use

### 1. Create an Account
- Click "Sign up" on the login page
- Enter your username, email, and password
- Click "Create Account"

### 2. Submit a Goal
- Enter your goal in the text area
- Be specific and measurable (e.g., "Complete 150 XP in Python programming challenges")
- If your goal involves XP, enter the amount and upload a screenshot of your current XP dashboard
- Click "Validate with AI" to check your goal

### 3. AI Validation
The AI will assess your goal based on:
- **Difficulty**: Must require at least 2 hours of work
- **Measurability**: Must have clear success criteria
- **Reasonableness**: Must be achievable but not trivial

### 4. Submit Your Goal
- If validation passes, click "Submit Goal"
- Your goal will appear in the "Your Goals" section
- Track your progress and mark goals as complete when finished

## 📋 Goal Examples

### ✅ Good Goals
- "Complete 150 XP in Python programming challenges" (with XP screenshot)
- "Send 12 personalized cold emails to potential clients with follow-up tracking"
- "Write and publish a 2000-word technical blog post with code examples"
- "Complete 5 LeetCode hard problems and document solutions"

### ❓ Goals That Trigger AI Questions
- "Add 500 words to brainlift" → AI asks: "What is brainlift? What type of content?"
- "Complete 150 XP on CodeSignal" → AI asks: "What is CodeSignal? What activities earn XP?"
- "Finish my project" → AI asks: "What type of project? What does completion look like?"

### ❌ Poor Goals
- "Send 3 emails" (too easy, < 2 hours)
- "Do some coding" (not measurable)
- "Get better at programming" (not specific)
- "Complete 50 XP" (without screenshot, and no other activities)

## 🎯 XP Goal Requirements

For XP-related goals:
- **Flexible XP**: Goals can combine XP with other activities (1 XP = ~1.5 minutes)
- **Screenshot Required**: Must upload current XP dashboard screenshot
- **Validation**: AI checks if XP amount justifies the time requirement

## 🛠️ Technical Stack

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **express-session**: Session management
- **Multer**: File upload handling
- **Axios**: HTTP client for AI API calls

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **Modern CSS**: CSS Grid, Flexbox, CSS Variables
- **Responsive Design**: Mobile-first approach

### AI Integration
- **Claude AI (Anthropic)**: Goal validation and assessment
- **Smart Prompting**: Structured prompts for consistent validation

### Storage
- **In-Memory Storage**: Current implementation (suitable for demo)
- **File System**: Screenshot storage in uploads/ directory
- **Session Storage**: Browser session management

## 🔒 Security Features

- **Session-based Authentication**: Secure user sessions
- **File Upload Validation**: Only image files allowed for screenshots
- **Input Sanitization**: HTML escaping for user content
- **CORS Protection**: Cross-origin request protection

## 📱 Responsive Design

The application is fully responsive and works on:
- **Desktop**: Full-featured experience with optimal layout
- **Tablet**: Adapted layout for medium screens
- **Mobile**: Touch-friendly interface with stacked layouts

## 🎨 Design Features

- **Dark Theme**: Easy on the eyes with professional appearance
- **Gradient Accents**: Beautiful color gradients for visual appeal
- **Smooth Animations**: Fade-ins, slide-ups, and hover effects
- **Loading States**: Clear feedback during API calls
- **Toast Notifications**: Non-intrusive status messages
- **Modal Dialogs**: Image viewing and confirmations

## 🚧 Future Enhancements

### Planned Features
- **Database Integration**: Replace in-memory storage with persistent database
- **Goal Categories**: Organize goals by categories or tags
- **Progress Analytics**: Charts and statistics for goal completion
- **Team Goals**: Collaborative goal setting and tracking
- **Reminder System**: Email/push notifications for goal deadlines
- **Export Features**: Export goal data to PDF or CSV
- **Social Features**: Share goals and celebrate achievements

### Technical Improvements
- **Password Hashing**: Implement bcrypt for secure password storage
- **JWT Authentication**: Replace sessions with JWT tokens
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Server-side validation for all inputs
- **Error Logging**: Comprehensive error tracking and logging
- **Unit Tests**: Test coverage for all major functionality

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you encounter any issues or have questions, please create an issue in the repository.

---

**Happy Goal Setting! 🎯**
