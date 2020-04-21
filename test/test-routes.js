const expect = require('chai').expect;
const request = require('request');
const chai = require('chai');
const apiUrl = 'http://localhost:8080';

describe('testing express endpoints', function() {
  it('Root testing check', function(done) {
    request(`${apiUrl}`, function(error, response, body) {
      expect(body).to.equal('Parking Manager API v1.0.0');
      done();
    });
  });
  it('Enums check', function(done) {
    request.get({url: `${apiUrl}/enums`}, function(error, response, body) {
      json = JSON.parse(body);
      expect(body).to.equal(JSON.stringify({
        'violations': [
          'No Tag',
          'Expired Tag',
          'Improper Parking',
        ],
        'locations': [
          'Garage A',
          'Garage B',
          'Garage C',
        ],
        'status': [
          'Rejected',
          'Submitted',
          'Completed',
        ],
      }));

      done();
    });
  });
  it('Register Check', function(done) {
    request.post({
      url: `${apiUrl}/auth/signup`,
      json: {
        first_name: 'marlon',
        last_name: 'calvo',
        email: 'nazlqszbvxwgrtzsgo1111111@awdrt.net',
        username: 'marlon_calvo111111111111111',
        password: 'password23',
        password_confirmation: 'password23',
      },
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      done();
    });
  });
  it('Login Check', function(done) {
    request.post({
      url: `${apiUrl}/auth/login`,
      json: {username: 'marlon_calvo', password: 'password'},
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      done();
    });
  });
  it('Bad Login Check', function(done) {
    request.post({
      url: `${apiUrl}/auth/login`,
      json: {username: 'marlon_calvo', password: 'password1'},
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(401);
      done();
    });
  });
  it('Grab tickets test', function(done) {
    request.get({
      url: `${apiUrl}/tickets/query_limited`,
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      const json = JSON.parse(body);
      expect(json.docs).to.be.an('array').that.is.not.empty;
      done();
    });
  });
  it('Grab ticket test', function(done) {
    request.get({
      url: `${apiUrl}/tickets/5e9e050a9a716e001162743c`,
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      const json = JSON.parse(body);
      expect(json.location).equals('Garage B');
      done();
    });
  });
  it('Create ticket test', function(done) {
    request.post({
      url: `${apiUrl}/tickets/create`,
      json: {
        license_plate: '123ABC',
        violation: 'No Tag',
        description: 'test',
        location: 'Garage A',
      },
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      done();
      /*
      const json = JSON.parse(body);
      expect(json.ticket_id).exist;
      request.get({
        url: `${apiUrl}/tickets/${json.ticket_id}`,
      }, function(error, response, body) {
        const json = JSON.parse(body);
        expect(json.violation).equals('No Tag');
        done();
      });
      */
    });
  });
  it('Update ticket test', function(done) {
    request.post({
      url: `${apiUrl}/tickets/5e9e050a9a716e001162743c`,
      json: {
        status: 'Rejected',
      },
    }, function(error, response, body) {
      expect(response.statusCode).equal(200);
      request.get({
        url: `${apiUrl}/tickets/5e9e050a9a716e001162743c`,
      }, function(error, response, body) {
        expect(response.statusCode).equal(200);
        const json = JSON.parse(body);
        expect(json.status).equals('Rejected');
        done();
      });
    });
  });
  it('Logout client', function(done) {
    request.post({
      url: `${apiUrl}/auth/logout`,
    }, function(error, response, body) {
      expect(response.statusCode).equal(200);
      const json = JSON.parse(body);
      expect(json.error).equals('Missing token');
      done();
    });
  });
});
