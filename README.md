# Wi-Fi Captive Portal

A modern, accessible captive portal system for Wi-Fi authentication and package management. This application provides a secure gateway for users to authenticate and purchase internet access packages before connecting to the network.

## Overview

This captive portal integrates with the Altonaut authentication system to provide:
- User authentication (login/signup)
- Internet access package selection
- Secure session management
- Responsive design for all devices

## Features

### 🔐 **User Authentication**
- **Sign In**: Existing users can authenticate with email and password
- **Sign Up**: New users can create accounts with name, email, and password
- **Session Management**: JWT token-based authentication with secure storage
- **Password Security**: Validation and secure handling of user credentials

### 📦 **Package Management**
- **Package Browsing**: View available internet access packages
- **Package Details**: See pricing, duration, and features for each package
- **Package Selection**: Choose and activate internet access packages
- **Order History**: Track purchased packages and their validity periods

### 🎨 **User Experience**
- **Two-Step Process**: Clear workflow from authentication to package selection
- **Real-time Feedback**: Loading states, error messages, and success notifications
- **Responsive Design**: Optimized for mobile phones, tablets, and desktop computers
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support

### 🔒 **Security Features**
- **Secure API Communication**: HTTPS-based communication with backend services
- **Token Management**: Automatic session handling and cleanup
- **Input Validation**: Client-side and server-side validation
- **Error Handling**: Graceful handling of network errors and API failures

## How It Works

1. **Network Detection**: When users connect to the Wi-Fi network, they are redirected to this portal
2. **Authentication**: Users either sign in with existing credentials or create a new account
3. **Package Selection**: Authenticated users browse and select internet access packages
4. **Payment/Activation**: Selected packages are activated for the user's session
5. **Internet Access**: Users gain internet access based on their selected package

## Technical Architecture

### Frontend Components
- **`index.html`**: Main portal interface with semantic HTML5 structure
- **`app.js`**: Core application logic for authentication and UI management
- **`altonaut.js`**: API client for backend communication
- **`index.css`**: Responsive styles with accessibility enhancements

### Backend Integration
- **Authentication API**: User login, signup, and profile management
- **Orders API**: Package listing, selection, and purchase processing
- **Session Management**: Secure token-based authentication

### Key Technologies
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Tailwind CSS
- **Authentication**: JWT tokens with sessionStorage
- **API Communication**: Fetch API with proper error handling
- **Accessibility**: ARIA attributes, semantic markup, keyboard navigation

## File Structure

```
├── index.html          # Main portal interface
├── app.js             # Application logic and state management
├── index.css          # Custom styles and responsive design
├── altonaut.js        # API client for backend communication
├── omada-portal.js    # Omada controller integration (if needed)
├── jquery.min.js      # jQuery library
├── img/               # Images and icons
│   ├── Edit.png
│   ├── EditActive.png
│   ├── ModalIconClose.png
│   ├── star.png
│   └── starGrey.png
└── README.md          # This documentation
```

## API Endpoints

The portal integrates with the following API endpoints:

- `POST /api/auth/login` - User authentication
- `POST /api/auth/signup` - User registration  
- `GET /api/auth/user` - Get user profile
- `GET /api/orders` - Get available packages

## Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile Support**: iOS Safari, Chrome Mobile, Samsung Internet
- **Accessibility**: Compatible with all major screen readers
- **Responsive**: Optimized for screens from 320px to 2560px+

## Configuration

Update the API base URL in `altonaut.js`:
```javascript
const API_BASE_URL = 'https://your-api-server.com'; // Change to your API URL
```

## Development Setup

1. Clone the repository
2. Update the API configuration in `altonaut.js`
3. Serve the files using a local web server
4. Access the portal through your captive portal system

## Accessibility Features

- **WCAG 2.1 AA Compliant**: Meets international accessibility standards
- **Keyboard Navigation**: Full functionality without mouse
- **Screen Reader Support**: Proper ARIA labels and semantic markup
- **High Contrast**: Readable in all lighting conditions
- **Focus Management**: Clear visual focus indicators
- **Mobile Accessibility**: Touch-friendly interface design
