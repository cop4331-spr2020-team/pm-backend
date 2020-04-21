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
        email: 'testing1234455@email.com',
        username: 'marlon_calvo234',
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
});
