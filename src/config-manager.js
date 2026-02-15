/**
 * ServiceNow MCP Server - Multi-Instance Configuration Manager
 *
 * Copyright (c) 2025 Happy Technologies LLC
 * Licensed under the MIT License - see LICENSE file for details
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '../config/servicenow-instances.json');
    this.instances = null;
  }

  /**
   * Load instances from JSON config file and environment variables
   */
  loadInstances() {
    if (this.instances) {
      return this.instances;
    }

    let allInstances = [];

    // 1. Try to load from environment variables first (most secure local option)
    const envInstance = this.getEnvInstance();
    if (envInstance) {
      allInstances.push(envInstance);
    }

    // 2. Try to load from JSON config file
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        if (config.instances && Array.isArray(config.instances)) {
          // If we have an env instance, it takes precedence as default
          const jsonInstances = config.instances.map(inst => {
            if (envInstance && (inst.name === envInstance.name || inst.url === envInstance.url)) {
              // Skip if it overlaps with env instance, env wins
              return null;
            }
            // If env exists, make sure json instances aren't marked as default unless env isn't default
            if (envInstance && envInstance.default) {
                return { ...inst, default: false };
            }
            return inst;
          }).filter(Boolean);
          
          allInstances = [...allInstances, ...jsonInstances];
        }
      }
    } catch (error) {
      // If we couldn't load JSON but have ENV, just log a warning
      if (allInstances.length > 0) {
        console.warn(`⚠️  Warning: Could not read ${this.configPath}: ${error.message}`);
      } else {
        throw new Error(`Failed to load ServiceNow instances config: ${error.message}`);
      }
    }

    if (allInstances.length === 0) {
      throw new Error('Missing ServiceNow credentials. Please set SERVICENOW_INSTANCE_URL, SERVICENOW_USERNAME, and SERVICENOW_PASSWORD in your .env file.');
    }

    // Ensure at least one instance is marked as default
    const hasDefault = allInstances.some(i => i.default === true);
    if (!hasDefault) {
      allInstances[0].default = true;
    }

    this.instances = allInstances;
    return this.instances;
  }

  /**
   * Helper to get instance from environment variables
   */
  getEnvInstance() {
    if (process.env.SERVICENOW_INSTANCE_URL && process.env.SERVICENOW_USERNAME && process.env.SERVICENOW_PASSWORD) {
      return {
        name: process.env.SERVICENOW_INSTANCE_NAME || 'default',
        url: process.env.SERVICENOW_INSTANCE_URL,
        username: process.env.SERVICENOW_USERNAME,
        password: process.env.SERVICENOW_PASSWORD,
        default: true,
        description: 'Loaded from .env'
      };
    }
    return null;
  }

  /**
   * Fallback: Load single instance from .env file (backward compatibility)
   * @deprecated Use loadInstances()
   */
  loadFromEnv() {
    const envInstance = this.getEnvInstance();
    if (!envInstance) {
      throw new Error('Missing ServiceNow credentials in environment variables.');
    }

    this.instances = [envInstance];
    return this.instances;
  }

  /**
   * Get instance by name
   * @param {string} name - Instance name
   * @returns {object} Instance configuration
   */
  getInstance(name) {
    const instances = this.loadInstances();
    const instance = instances.find(i => i.name === name);

    if (!instance) {
      throw new Error(`Instance '${name}' not found. Available instances: ${instances.map(i => i.name).join(', ')}`);
    }

    return instance;
  }

  /**
   * Get default instance
   * @returns {object} Default instance configuration
   */
  getDefaultInstance() {
    const instances = this.loadInstances();
    const defaultInstance = instances.find(i => i.default === true);

    if (!defaultInstance) {
      // If no default is set, use the first instance
      return instances[0];
    }

    return defaultInstance;
  }

  /**
   * Get instance by name or default if not specified
   * @param {string} name - Optional instance name
   * @returns {object} Instance configuration
   */
  getInstanceOrDefault(name = null) {
    if (name) {
      return this.getInstance(name);
    }

    // Check for SERVICENOW_INSTANCE env variable
    const envInstance = process.env.SERVICENOW_INSTANCE;
    if (envInstance) {
      return this.getInstance(envInstance);
    }

    return this.getDefaultInstance();
  }

  /**
   * List all available instances
   * @returns {Array} List of instance names and descriptions
   */
  listInstances() {
    const instances = this.loadInstances();
    return instances.map(i => ({
      name: i.name,
      url: i.url,
      default: i.default || false,
      description: i.description || ''
    }));
  }

  /**
   * Validate instance configuration
   * @param {object} instance - Instance configuration
   * @returns {boolean} True if valid
   */
  validateInstance(instance) {
    const required = ['name', 'url', 'username', 'password'];
    for (const field of required) {
      if (!instance[field]) {
        throw new Error(`Instance configuration missing required field: ${field}`);
      }
    }
    return true;
  }
}

// Singleton instance
export const configManager = new ConfigManager();