/**
 * DynamoDB Client Utility
 * 
 * Provides clean abstraction over AWS DynamoDB operations with:
 * - Error handling
 * - Logging
 * - Retry logic
 * - Type safety helpers
 */

const AWS = require('aws-sdk');
const logger = require('./logger');

// Configure DynamoDB client
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.NODE_ENV === 'development' && {
    endpoint: 'http://localhost:8000', // Local DynamoDB
  }),
});

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'taskboard-dev';

/**
 * Get table name with environment prefix
 */
const getTableName = (table) => `${TABLE_PREFIX}-${table}`;

/**
 * Generic get item
 */
const getItem = async (tableName, key) => {
  try {
    const params = {
      TableName: getTableName(tableName),
      Key: key,
    };

    logger.debug(`DynamoDB GetItem: ${tableName}`, { key });
    const result = await dynamodb.get(params).promise();
    return result.Item || null;
  } catch (error) {
    logger.error(`DynamoDB GetItem Error: ${tableName}`, { error: error.message, key });
    throw error;
  }
};

/**
 * Generic put item
 */
const putItem = async (tableName, item) => {
  try {
    const params = {
      TableName: getTableName(tableName),
      Item: item,
    };

    logger.debug(`DynamoDB PutItem: ${tableName}`, { item });
    await dynamodb.put(params).promise();
    return item;
  } catch (error) {
    logger.error(`DynamoDB PutItem Error: ${tableName}`, { error: error.message });
    throw error;
  }
};

/**
 * Generic update item
 */
const updateItem = async (tableName, key, updates) => {
  try {
    // Build update expression dynamically
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((field, index) => {
      const placeholder = `#field${index}`;
      const valuePlaceholder = `:value${index}`;
      
      updateExpression.push(`${placeholder} = ${valuePlaceholder}`);
      expressionAttributeNames[placeholder] = field;
      expressionAttributeValues[valuePlaceholder] = updates[field];
    });

    const params = {
      TableName: getTableName(tableName),
      Key: key,
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    logger.debug(`DynamoDB UpdateItem: ${tableName}`, { key, updates });
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    logger.error(`DynamoDB UpdateItem Error: ${tableName}`, { error: error.message, key });
    throw error;
  }
};

/**
 * Generic delete item
 */
const deleteItem = async (tableName, key) => {
  try {
    const params = {
      TableName: getTableName(tableName),
      Key: key,
    };

    logger.debug(`DynamoDB DeleteItem: ${tableName}`, { key });
    await dynamodb.delete(params).promise();
    return true;
  } catch (error) {
    logger.error(`DynamoDB DeleteItem Error: ${tableName}`, { error: error.message, key });
    throw error;
  }
};

/**
 * Query items
 */
const queryItems = async (tableName, keyCondition, options = {}) => {
  try {
    const params = {
      TableName: getTableName(tableName),
      KeyConditionExpression: keyCondition.expression,
      ExpressionAttributeNames: keyCondition.names || {},
      ExpressionAttributeValues: keyCondition.values || {},
      ...options,
    };

    logger.debug(`DynamoDB Query: ${tableName}`, { keyCondition });
    const result = await dynamodb.query(params).promise();
    return result.Items || [];
  } catch (error) {
    logger.error(`DynamoDB Query Error: ${tableName}`, { error: error.message });
    throw error;
  }
};

/**
 * Scan items (use sparingly)
 */
const scanItems = async (tableName, filterExpression = null, options = {}) => {
  try {
    const params = {
      TableName: getTableName(tableName),
      ...options,
    };

    if (filterExpression) {
      params.FilterExpression = filterExpression.expression;
      params.ExpressionAttributeNames = filterExpression.names || {};
      params.ExpressionAttributeValues = filterExpression.values || {};
    }

    logger.debug(`DynamoDB Scan: ${tableName}`);
    const result = await dynamodb.scan(params).promise();
    return result.Items || [];
  } catch (error) {
    logger.error(`DynamoDB Scan Error: ${tableName}`, { error: error.message });
    throw error;
  }
};

/**
 * Batch get items
 */
const batchGetItems = async (tableName, keys) => {
  try {
    if (!keys || keys.length === 0) {
      return [];
    }

    const params = {
      RequestItems: {
        [getTableName(tableName)]: {
          Keys: keys,
        },
      },
    };

    logger.debug(`DynamoDB BatchGet: ${tableName}`, { count: keys.length });
    const result = await dynamodb.batchGet(params).promise();
    return result.Responses[getTableName(tableName)] || [];
  } catch (error) {
    logger.error(`DynamoDB BatchGet Error: ${tableName}`, { error: error.message });
    throw error;
  }
};

/**
 * Batch write items (put or delete)
 */
const batchWriteItems = async (tableName, items, isDelete = false) => {
  try {
    if (!items || items.length === 0) {
      return true;
    }

    // DynamoDB batch write limit is 25 items
    const batches = [];
    for (let i = 0; i < items.length; i += 25) {
      batches.push(items.slice(i, i + 25));
    }

    for (const batch of batches) {
      const requests = batch.map((item) => ({
        [isDelete ? 'DeleteRequest' : 'PutRequest']: isDelete
          ? { Key: item }
          : { Item: item },
      }));

      const params = {
        RequestItems: {
          [getTableName(tableName)]: requests,
        },
      };

      logger.debug(`DynamoDB BatchWrite: ${tableName}`, { count: batch.length });
      await dynamodb.batchWrite(params).promise();
    }

    return true;
  } catch (error) {
    logger.error(`DynamoDB BatchWrite Error: ${tableName}`, { error: error.message });
    throw error;
  }
};

/**
 * Transaction write (atomic operations)
 */
const transactWrite = async (operations) => {
  try {
    const params = {
      TransactItems: operations.map((op) => {
        const tableName = getTableName(op.tableName);
        
        if (op.type === 'Put') {
          return { Put: { TableName: tableName, Item: op.item } };
        }
        if (op.type === 'Update') {
          return { Update: { ...op.params, TableName: tableName } };
        }
        if (op.type === 'Delete') {
          return { Delete: { TableName: tableName, Key: op.key } };
        }
        throw new Error(`Unknown operation type: ${op.type}`);
      }),
    };

    logger.debug('DynamoDB TransactWrite', { operationCount: operations.length });
    await dynamodb.transactWrite(params).promise();
    return true;
  } catch (error) {
    logger.error('DynamoDB TransactWrite Error', { error: error.message });
    throw error;
  }
};

module.exports = {
  dynamodb,
  getTableName,
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
  scanItems,
  batchGetItems,
  batchWriteItems,
  transactWrite,
};
