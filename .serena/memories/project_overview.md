# TokenTally - Project Overview

## Purpose
TokenTally is a precision LLM chatbot cost forecasting tool for small businesses. It predicts monthly operating costs within ±5% accuracy for chatbots processing millions of tokens across Claude and OpenAI models.

**Target Users**: Small business owners building high-volume customer service chatbots
**Core Value**: Identify cost optimization opportunities worth $500-$5,000/month through caching, model selection, and context strategies

## Key Features
- **Chatbot-Specific Cost Modeling**: Not generic LLM usage estimation
- **Prompt Caching Modeling** (Claude): 90% cost reduction on cached system prompts
- **Context Accumulation Tracking**: Models token growth across conversation turns
- **Model Comparison**: Side-by-side comparison across 6 models (3 OpenAI, 3 Claude)
- **Optimization Recommendations**: AI-generated savings opportunities
- **Export Capabilities**: PDF reports and CSV downloads

## Deployment
- Fully client-side application (no backend server)
- No user authentication or database
- All calculations happen in browser
- Target platforms: Vercel/Netlify

## Project Phase
- **Current**: Foundation (PRD complete, implementation starting)
- **Target Launch**: Week 5 (beta testing)
- **MVP Definition**: 6 models, chatbot calculator, PDF/CSV export, optimization recommendations