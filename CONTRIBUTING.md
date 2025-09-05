# Contributing to Yuyuko Bot

Thank you for your interest in contributing to Yuyuko Bot! This document provides guidelines and information to help you contribute effectively.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/yuyuko-bot.git`
3. Create a new branch for your feature or bugfix: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit your changes with a descriptive commit message
6. Push to your fork
7. Create a pull request

## Project Structure

```
yuyuko-bot/
├── commands/          # Discord slash commands
├── firebase/          # Firebase configuration and initialization
├── services/          # Business logic separated from commands
├── utils/             # Utility functions and helpers
├── rss/               # RSS feed processing
├── environment.js     # Environment variable management
├── index.js           # Main bot entry point
└── ...
```

### Key Directories

- `commands/`: Contains all Discord slash commands. Each command should be in its own file.
- `services/`: Contains business logic separated from Discord command implementations.
- `utils/`: Contains helper functions that are used across the application.
- `firebase/`: Contains Firebase configuration and initialization.

## Development Setup

1. Install Node.js (v16 or higher)
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example` (if it existed)
4. Add required environment variables:
   - `DISCORD_TOKEN`: Your Discord bot token
   - `CLIENT_ID`: Your Discord application client ID
   - `GEMINI_API_KEY`: Gemini API key (for AI features)
5. Run the bot: `npm run dev`

## Code Style

- Use consistent indentation (2 spaces)
- Follow camelCase for variables and functions
- Use UPPER_CASE for constants
- Write JSDoc comments for all functions
- Keep functions focused and small
- Use descriptive variable and function names

### Example

```javascript
/**
 * Calculate the total points for a user's immersion activity
 * @param {number} amount - The amount of activity (pages, minutes, etc.)
 * @param {string} mediaType - The type of media (anime, manga, etc.)
 * @returns {number} The calculated points
 */
function calculatePoints(amount, mediaType) {
  const multipliers = {
    visual_novel: 0.0028571428571429,
    manga: 0.25,
    anime: 13.0,
    // ... other media types
  };
  
  return Math.round(amount * (multipliers[mediaType] || 1));
}
```

## Making Changes

1. Always create a new branch for your changes
2. Write clear, descriptive commit messages
3. Follow the existing code style
4. Add JSDoc comments to new functions
5. Update README.md if you add new features or change functionality
6. Test your changes thoroughly

## Testing

- Test all commands manually before submitting
- Ensure error handling works correctly
- Test edge cases
- Verify that all environment variables are properly handled

## Submitting Changes

1. Ensure your code follows the style guide
2. Write a clear, descriptive pull request message
3. Reference any related issues
4. Be prepared to make changes based on code review feedback

## Reporting Issues

When reporting issues, please include:

1. A clear description of the problem
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Environment information (Node.js version, OS, etc.)

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.