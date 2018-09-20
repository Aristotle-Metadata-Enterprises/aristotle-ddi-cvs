
const axios = require('axios')
const baseurl = 'https://ddi-alliance.aristotlecloud.io/api/graphql/api';
let response;
const handlebars = require('handlebars')
const fs = require('fs')
const util = require('util')

// Convert fs.readFile into Promise version of same    
// Thanks to https://stackoverflow.com/a/46867579
const readFile = util.promisify(fs.readFile);

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @param {string} event.resource - Resource path.
 * @param {string} event.path - Path parameter.
 * @param {string} event.httpMethod - Incoming request's method name.
 * @param {Object} event.headers - Incoming request headers.
 * @param {Object} event.queryStringParameters - query string parameters.
 * @param {Object} event.pathParameters - path parameters.
 * @param {Object} event.stageVariables - Applicable stage variables.
 * @param {Object} event.requestContext - Request context, including authorizer-returned key-value pairs, requestId, sourceIp, etc.
 * @param {Object} event.body - A JSON string of the request payload.
 * @param {boolean} event.body.isBase64Encoded - A boolean flag to indicate if the applicable request payload is Base64-encode
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 * @param {string} context.logGroupName - Cloudwatch Log Group name
 * @param {string} context.logStreamName - Cloudwatch Log stream name.
 * @param {string} context.functionName - Lambda function name.
 * @param {string} context.memoryLimitInMB - Function memory.
 * @param {string} context.functionVersion - Function version identifier.
 * @param {function} context.getRemainingTimeInMillis - Time in milliseconds before function times out.
 * @param {string} context.awsRequestId - Lambda request ID.
 * @param {string} context.invokedFunctionArn - Function ARN.
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * @returns {boolean} object.isBase64Encoded - A boolean flag to indicate if the applicable payload is Base64-encode (binary support)
 * @returns {string} object.statusCode - HTTP Status Code to be returned to the client
 * @returns {Object} object.headers - HTTP Headers to be returned
 * @returns {Object} object.body - JSON Payload to be returned
 * 
 */
exports.lambdaHandler = async (event, context) => {

  var uuid = event.pathParameters.uuid

  if (uuid === undefined) {
    console.log('No uuid provided')
    return {
      statusCode: 404,
      body: 'No uuid provided'
    }
  }

  // Build graphql query
  var query = `query {
    valueDomains (uuid: "${uuid}") {
      edges {
        node {
          uuid
          name
          definition
          version
          conceptualDomain {
            name
            definition
            comments
            originUri
            ConceptPtr {
              slots {
                edges {
                  node {
                    name
                    value
                  }
                }
              }
              identifiers {
                identifier
                version
              }
            }
          }
          permissiblevalueSet {
            value
            valueMeaning {
              name
              definition
            }
          }
          supplementaryvalueSet {
            value
            valueMeaning {
              name
              definition
            }
          }
        }
      }
    }
  }`
  
  // Read xml template file
  var ddi_template_string
  try {
    ddi_template_string = await readFile('ddi-template.xml', {encoding: 'utf-8'})
  } catch(err) {
    console.log(err);
    return {
      statusCode: 404,
      body: 'Not Found'
    }
  }

  // Compile handlebars template
  var template = handlebars.compile(ddi_template_string)
  
  // axios options
  var options = {
    params: {
      raw: true,
      query: query  
    }
  }
  
  // Perform graphql query
  var result
  try {
    result = await axios(baseurl, options);
  } catch (err) {
    console.log(err.message)
    return {
      statusCode: 404,
      body: err.message
    }
  }

  // Setup context
  var context = result.data.data.valueDomains.edges[0].node

  var cdslots = {}
  var edges = context.conceptualDomain.ConceptPtr.slots.edges
  for (var edge of edges) {
    cdslots[edge.node.name] = edge.node.value
  }
  context.conceptualDomain.slots = cdslots

  context.conceptualDomain.identifier = context.conceptualDomain.ConceptPtr.identifiers[0]
  
  // Render template
  xml_response = template(context)

  // Return response
  response = {
    statusCode: 200,
    body: xml_response
  }
  return response
};
