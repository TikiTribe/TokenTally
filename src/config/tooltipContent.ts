/**
 * Tooltip Content Configuration
 * 
 * Centralized tooltip text for all input fields across both calculators.
 * Content is concise (1-2 sentences) as per requirements.
 */

export const TOOLTIP_CONTENT = {
  // Chatbot Calculator Tooltips
  chatbot: {
    modelSelection: 
      "Choose the LLM model for your chatbot. Claude models support prompt caching for 90% cost reduction.",
    
    systemPromptTokens:
      "The base instructions that define your chatbot's behavior and knowledge. Sent with every conversation turn. (~1.3 tokens/word, ~4 chars/token)",
    
    avgUserMessageTokens:
      "Typical length of user questions or messages. (~1.3 tokens/word, ~4 chars/token)",
    
    avgResponseTokens:
      "Typical length of chatbot responses. Longer responses cost more due to higher output token pricing. (~1.3 tokens/word, ~4 chars/token)",
    
    conversationTurns: 
      "Number of back-and-forth exchanges per conversation. More turns mean higher total token consumption.",
    
    conversationsPerMonth: 
      "Total conversations your chatbot will handle monthly. Primary driver of total monthly cost.",
    
    contextStrategy:
      "How much conversation history is included in each turn. Minimal (50t ≈ 38w), Moderate (150t ≈ 115w), Full (300t ≈ 230w). Minimal saves cost, Full improves response quality.",
    
    cacheHitRate: 
      "Percentage of conversations benefiting from cached system prompts. Production chatbots typically achieve 90%.",
  },

  // Prompt Calculator Tooltips
  prompt: {
    modelSelection: 
      "Choose the LLM model for processing your prompt. Different models have different pricing and capabilities.",
    
    promptInput:
      "Enter your prompt text. Character and token counts update in real-time. (~1.3 tokens/word, ~4 chars/token)",
    
    responsePreset:
      "Estimated length of the model's response. Output tokens are typically 3-4x more expensive than input tokens. Small (50t ≈ 38w), Medium (150t ≈ 115w), Large (300t ≈ 230w), XLarge (500t ≈ 385w).",
    
    batchOperations: 
      "How many times this prompt will be executed monthly. Use for recurring batch processing workflows.",
    
    multiTurnToggle: 
      "Enable if your prompt involves back-and-forth dialogue. Models conversation context accumulation for accurate costing.",
    
    conversationTurns: 
      "Number of back-and-forth exchanges. More turns increase total cost through context accumulation.",
    
    contextStrategy:
      "How much conversation history is retained per turn. Minimal (50t/turn ≈ 38w), Moderate (150t/turn ≈ 115w), Full (300t/turn ≈ 230w). Affects response quality and token consumption.",
    
    cacheHitRate: 
      "Percentage of prompts benefiting from cached content. 90% is typical for production batch operations.",
  },
} as const;
