const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Rate limiting data structure
const rateLimitData = new Map(); // userId -> { count: number, timestamp: number }

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3;

class CustomPromptManager {
    constructor() {
        this.customPromptDir = path.join(__dirname, 'customPrompt');
        this.ensureDirectoryExists();
    }

    // Ensure the custom prompt directory exists
    ensureDirectoryExists() {
        if (!fs.existsSync(this.customPromptDir)) {
            fs.mkdirSync(this.customPromptDir, { recursive: true });
        }
    }

    // Check if user is rate limited
    isRateLimited(userId) {
        const now = Date.now();
        const userData = rateLimitData.get(userId);

        if (!userData) {
            // First request from this user
            rateLimitData.set(userId, { count: 1, timestamp: now });
            return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
        }

        // Check if the window has passed
        if (now - userData.timestamp > RATE_LIMIT_WINDOW) {
            // Reset the counter
            rateLimitData.set(userId, { count: 1, timestamp: now });
            return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
        }

        // Check if user has exceeded the limit
        if (userData.count >= MAX_REQUESTS_PER_WINDOW) {
            const timeLeft = Math.ceil((RATE_LIMIT_WINDOW - (now - userData.timestamp)) / 1000);
            return { limited: true, timeLeft };
        }

        // Increment the counter
        rateLimitData.set(userId, { 
            count: userData.count + 1, 
            timestamp: now 
        });
        
        return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - (userData.count + 1) };
    }

    // Function to get user's custom prompt from local file
    getUserCustomPrompt(userId) {
        const customPromptPath = path.join(this.customPromptDir, `${userId}.json`);
        
        try {
            if (fs.existsSync(customPromptPath)) {
                const userData = JSON.parse(fs.readFileSync(customPromptPath, 'utf8'));
                return userData.prompt || null;
            }
            return null; // No custom prompt found
        } catch (error) {
            console.error(`Error reading custom prompt for user ${userId}:`, error);
            return null; // Return null to fall back to default
        }
    }

    // Function to save user's custom prompt to local file
    saveUserCustomPrompt(userId, prompt) {
        const customPromptPath = path.join(this.customPromptDir, `${userId}.json`);
        
        try {
            const userData = {
                userId: userId,
                prompt: prompt,
                timestamp: new Date().toISOString(),
                lastUpdated: Date.now()
            };
            
            fs.writeFileSync(customPromptPath, JSON.stringify(userData, null, 2));
            return true;
        } catch (error) {
            console.error(`Error saving custom prompt for user ${userId}:`, error);
            return false;
        }
    }

    // Function to delete user's custom prompt
    deleteUserCustomPrompt(userId) {
        const customPromptPath = path.join(this.customPromptDir, `${userId}.json`);
        
        try {
            if (fs.existsSync(customPromptPath)) {
                fs.unlinkSync(customPromptPath);
                return true;
            }
            return false; // File doesn't exist
        } catch (error) {
            console.error(`Error deleting custom prompt for user ${userId}:`, error);
            return false;
        }
    }

    // Function to validate if a URL is a valid Rentry URL
    isValidRentryUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'rentry.co' || urlObj.hostname === 'www.rentry.co';
        } catch (error) {
            return false;
        }
    }

    // Helper function to extract Rentry code from URL
    extractRentryCode(url) {
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'rentry.co' || urlObj.hostname === 'www.rentry.co') {
                // Extract the path (the code part after the domain)
                const pathParts = urlObj.pathname.split('/');
                // The code is the last non-empty part of the path
                const code = pathParts[pathParts.length - 1];
                return code || null;
            }
            return null;
        } catch (error) {
            console.error('Invalid URL format:', error);
            return null;
        }
    }

    // Function to fetch prompt from Rentry URL
    async fetchPromptFromRentry(rentryUrl) {
        try {
            // Extract the Rentry code from the URL
            const rentryCode = this.extractRentryCode(rentryUrl);
            if (!rentryCode) {
                throw new Error('Invalid Rentry URL');
            }
            
            // Fetch the main Rentry page
            const response = await fetch(`https://rentry.co/${rentryCode}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch Rentry content: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Create a simple regex to extract content from the entry-text div
            // Look for the content within the main content area
            const contentMatch = html.match(/<div[^>]*class="[^"]*entry-text[^"]*"[^>]*>[\s\S]*?<article>([\s\S]*?)<\/article>/i);
            if (contentMatch && contentMatch[1]) {
                // Extract text content by removing HTML tags
                const cleanContent = contentMatch[1]
                    .replace(/<[^>]*>/g, '') // Remove all HTML tags
                    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
                    .replace(/</g, '<')   // Decode HTML entities
                    .replace(/>/g, '>')
                    .replace(/&/g, '&')
                    .replace(/"/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/\s+/g, ' ')    // Normalize whitespace
                    .trim();
                
                // If the extracted content looks like it contains access code prompts, throw an error
                if (cleanContent.toLowerCase().includes('access code') || 
                    cleanContent.toLowerCase().includes('redirecting to page')) {
                    throw new Error('Rentry page requires access code or is not accessible. Please check the URL.');
                }
                
                return cleanContent;
            } else {
                // Fallback: try to get content from raw endpoint with appropriate headers
                try {
                    const rawResponse = await fetch(`https://rentry.co/${rentryCode}/raw`, {
                        headers: {
                            'Accept': 'text/plain',
                            'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)'
                        }
                    });
                    
                    if (rawResponse.ok) {
                        const rawContent = await rawResponse.text();
                        
                        // Check if raw content is HTML (indicating access code page)
                        if (rawContent.toLowerCase().includes('access code') || 
                            rawContent.toLowerCase().includes('redirecting to page') ||
                            rawContent.toLowerCase().includes('<!doctype') ||
                            rawContent.toLowerCase().includes('<html')) {
                            throw new Error('Rentry page requires access code or is not accessible. Please check the URL.');
                        }
                        
                        return rawContent.trim();
                    } else {
                        // If raw endpoint also fails, return the original error
                        throw new Error(`Failed to fetch raw content: ${rawResponse.status}`);
                    }
                } catch (rawError) {
                    console.error('Raw endpoint failed, using fallback:', rawError);
                    throw new Error('Failed to extract content from Rentry page. Please ensure the URL is correct and accessible.');
                }
            }
        } catch (error) {
            console.error('Error fetching from Rentry:', error);
            throw error;
        }
    }

    // Validate prompt content (basic validation)
    validatePromptContent(content) {
        if (!content || typeof content !== 'string') {
            return { valid: false, error: 'Prompt content is required and must be a string' };
        }

        if (content.length < 10) {
            return { valid: false, error: 'Prompt is too short (minimum 10 characters)' };
        }

        if (content.length > 10000) { // 10k character limit
            return { valid: false, error: 'Prompt is too long (maximum 10,000 characters)' };
        }

        // Check for potentially harmful content (basic security check)
        const harmfulPatterns = [
            /eval\s*\(/i,
            /Function\s*\(/,
            /setTimeout\s*\(/,
            /setInterval\s*\(/,
            /import\s+.*from/i,
            /require\s*\(/i
        ];

        for (const pattern of harmfulPatterns) {
            if (pattern.test(content)) {
                return { valid: false, error: 'Prompt contains potentially harmful content' };
            }
        }

        return { valid: true };
    }

    // Create embed for success response
    createSuccessEmbed(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(0x00ADEF)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    // Create embed for error response
    createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    // Create embed for rate limit response
    createRateLimitEmbed(timeLeft) {
        return new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('⏰ Rate Limit Exceeded')
            .setDescription(`You're making requests too quickly. Please wait ${timeLeft} seconds before trying again.`)
            .setTimestamp();
    }
}

module.exports = CustomPromptManager;
