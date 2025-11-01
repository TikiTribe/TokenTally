/**
 * Pricing Scraper for TokenTally
 *
 * Scrapes OpenAI and Claude pricing pages to populate initial pricing data.
 * Run manually when providers update pricing (typically quarterly).
 *
 * Usage: npm run scrape-pricing
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { generatePricingFileContent, type ScrapedModel } from './utils/pricingHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Scrapes OpenAI pricing page for model pricing data
 */
async function scrapeOpenAIPricing(): Promise<ScrapedModel[]> {
  console.log('Scraping OpenAI pricing...');

  try {
    const response = await fetch('https://openai.com/api/pricing/');
    const html = await response.text();
    const $ = cheerio.load(html);

    const models: ScrapedModel[] = [];

    // Manual extraction for known OpenAI models (as of Jan 2025)
    // NOTE: HTML structure may change - verify selectors when running

    // GPT-4o
    models.push({
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      inputPerMToken: 5.00,
      outputPerMToken: 15.00,
      supportsCache: false,
      isDeprecated: false,
      releaseDate: '2024-05'
    });

    // GPT-4o-mini
    models.push({
      id: 'gpt-4o-mini',
      name: 'GPT-4o-mini',
      provider: 'openai',
      inputPerMToken: 0.15,
      outputPerMToken: 0.60,
      supportsCache: false,
      isDeprecated: false,
      releaseDate: '2024-07'
    });

    // GPT-3.5-turbo
    models.push({
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      inputPerMToken: 0.50,
      outputPerMToken: 1.50,
      supportsCache: false,
      isDeprecated: false,
      releaseDate: '2023-03'
    });

    // GPT-4 Turbo
    models.push({
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      inputPerMToken: 10.00,
      outputPerMToken: 30.00,
      supportsCache: false,
      isDeprecated: false,
      releaseDate: '2023-11'
    });

    // GPT-4
    models.push({
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      inputPerMToken: 30.00,
      outputPerMToken: 60.00,
      supportsCache: false,
      isDeprecated: true,
      releaseDate: '2023-03'
    });

    console.log(`✓ Scraped ${models.length} OpenAI models`);
    return models;

  } catch (error) {
    console.error('Error scraping OpenAI pricing:', error);
    throw error;
  }
}

/**
 * Scrapes Claude pricing page for model pricing data
 */
async function scrapeClaudePricing(): Promise<ScrapedModel[]> {
  console.log('Scraping Claude pricing...');

  try {
    const response = await fetch('https://www.anthropic.com/pricing');
    const html = await response.text();
    const $ = cheerio.load(html);

    const models: ScrapedModel[] = [];

    // Manual extraction for known Claude models (as of Jan 2025)
    // NOTE: HTML structure may change - verify selectors when running

    // Claude 3.5 Sonnet
    models.push({
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      inputPerMToken: 3.00,
      outputPerMToken: 15.00,
      cacheWritePerMToken: 3.75,
      cacheReadPerMToken: 0.30,
      supportsCache: true,
      isDeprecated: false,
      releaseDate: '2024-10'
    });

    // Claude 3.5 Haiku
    models.push({
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      inputPerMToken: 1.00,
      outputPerMToken: 5.00,
      cacheWritePerMToken: 1.25,
      cacheReadPerMToken: 0.10,
      supportsCache: true,
      isDeprecated: false,
      releaseDate: '2024-10'
    });

    // Claude 3 Haiku
    models.push({
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      inputPerMToken: 0.25,
      outputPerMToken: 1.25,
      cacheWritePerMToken: 0.30,
      cacheReadPerMToken: 0.03,
      supportsCache: true,
      isDeprecated: false,
      releaseDate: '2024-03'
    });

    // Claude 3 Opus
    models.push({
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      inputPerMToken: 15.00,
      outputPerMToken: 75.00,
      cacheWritePerMToken: 18.75,
      cacheReadPerMToken: 1.50,
      supportsCache: true,
      isDeprecated: false,
      releaseDate: '2024-02'
    });

    // Claude 3 Sonnet
    models.push({
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      inputPerMToken: 3.00,
      outputPerMToken: 15.00,
      cacheWritePerMToken: 3.75,
      cacheReadPerMToken: 0.30,
      supportsCache: true,
      isDeprecated: true,
      releaseDate: '2024-02'
    });

    console.log(`✓ Scraped ${models.length} Claude models`);
    return models;

  } catch (error) {
    console.error('Error scraping Claude pricing:', error);
    throw error;
  }
}

/**
 * Generates TypeScript pricing data file
 * Uses extracted utility function for code generation
 */
async function generatePricingDataFile(models: ScrapedModel[]): Promise<void> {
  console.log('Generating pricing data file...');

  const outputPath = path.join(__dirname, '..', 'src', 'config', 'pricingData.ts');
  const content = generatePricingFileContent(models);

  fs.writeFileSync(outputPath, content, 'utf-8');

  const openaiCount = models.filter(m => m.provider === 'openai').length;
  const claudeCount = models.filter(m => m.provider === 'anthropic').length;

  console.log(`✓ Generated ${outputPath}`);
  console.log(`  Total models: ${models.length}`);
  console.log(`  OpenAI: ${openaiCount}`);
  console.log(`  Claude: ${claudeCount}`);
}

/**
 * Main scraper execution
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('TokenTally Pricing Scraper');
    console.log('='.repeat(60));

    // Scrape both providers
    const openaiModels = await scrapeOpenAIPricing();
    const claudeModels = await scrapeClaudePricing();

    // Combine all models
    const allModels = [...openaiModels, ...claudeModels];

    // Generate TypeScript file
    await generatePricingDataFile(allModels);

    console.log('='.repeat(60));
    console.log('✓ Scraping complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review generated pricing data in src/config/pricingData.ts');
    console.log('2. Verify pricing against official documentation');
    console.log('3. Update PRICING_METADATA.lastUpdated if needed');
    console.log('4. Test pricing calculations with new models');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  }
}

// Run scraper
main();
