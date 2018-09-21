'use strict';

const app = require('../../app.js');
const chai = require('chai');
const expect = chai.expect;
var context;
var event = {
  pathParameters: {
    uuid: "8404a14a-bbae-11e8-b33d-0242ac120005"
  }
}

describe('Tests index', function () {
    it('verifies successful response', async () => {
        const result = await app.lambdaHandler(event, context, (err, result) => {
            expect(result).to.be.an('object');
            expect(result.statusCode).to.equal(200);
            expect(result.body).to.be.an('string');
        });
    });
});

