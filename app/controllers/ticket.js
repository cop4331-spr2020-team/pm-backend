const fs = require('fs');
const fileType = require('file-type');
const User = require('../models/user');
const Ticket = require('../models/ticket');

/**
 * Encode file data to base64 encoded string
 * @param {*} file - file path to encode
 * @return {Buffer} base64 encoded buffer of file
 */
function base64_encode(file) {
  // read binary data
  const bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString('base64');
}

/**
 * Parses file content of image
 * @param {*} imagePath path to image to parse
 * @return {String} data image binary data
 */
function readImage(imagePath) {
  return fs.readFileSync(imagePath);
}

/**
 * Creates mongoose query from query params.
 * @param {*} query query params from express request
 * @return {JSON} query json object
 */
function getTicketsQuery(query) {
  const mongooseQuery = {};
  console.log(query);
  if (query.user_ids) {
    mongooseQuery._userId = {$in: JSON.parse(query.user_ids)};
  }
  if (query.created_after && query.created_before) {
    mongooseQuery.createdAt = {
      $gte: new Date(Number(query.created_after)),
      $lt: new Date(Number(query.created_before)),
    };
  } else if (query.created_after) {
    mongooseQuery.createdAt = {$gte: new Date(Number(query.created_after))};
  } else if (query.created_before) {
    mongooseQuery.createdAt = {$lt: new Date(Number(query.created_before))};
  }

  return mongooseQuery;
}

const createTicket = async (req, res) => {
  console.log(req);

  if (req.error) {
    res.json(req.error).status(req.error.statusCode || 500);
    return;
  }

  const {
    // eslint-disable-next-line camelcase
    violation,
    // eslint-disable-next-line camelcase
    license_plate,
    description,
    location,
    // eslint-disable-next-line camelcase
    additional_comments,
    image,
  } = req.body;

  const username = req.username;
  console.log(req.username);
  User.findOne({username: username})
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure during retrieving user';
        throw error;
      })
      .then((user) => {
        if (!user) {
          const error = new Error();
          error.statusCode = 401;
          error.message = 'unable to find user';
          throw error;
        }

        ticket = new Ticket({
          ticketor_name: user.first_name + ' ' + user.last_name,
          violation: violation,
          license_plate: license_plate,
          description: description,
          location: location,
          additional_comments: additional_comments,
          _userId: user._id,
        });

        if (image) {
          return fileType.fromBuffer((Buffer.from(image, 'base64')))
              .catch((error) => {
                error.statusCode = 404;
                error.message = 'unable to parse image type';
                throw error;
              })
              .then((fileInfo) => {
                console.log(fileInfo);
                ticket.image = {};
                ticket.image.data = image;
                ticket.image.content_type = fileInfo.mime;
                return ticket.save()
                    .catch((error) => {
                      error.statusCode = 500;
                      error.message = 'Unable to store ticket';
                      console.log(error);
                      throw error;
                    });
              });
        } else {
          return ticket.save()
              .catch((error) => {
                error.statusCode = 500;
                error.message = 'Unable to store ticket';
                console.log(error);
                throw error;
              });
        }
      })
      .then((ticket) => {
        res.json({ticket_id: ticket._id, error: ''}).status(200);
      })
      .catch((error) => {
        console.log(error);
        res.json({error}).status(error.statusCode || 500);
      });
};

const updateTicket = async (req, res) => {
  const ticketId = req.params.ticket_id;

  if (req.error) {
    res.json(req.error).status(req.error.statusCode || 500);
    return;
  }

  Ticket.findById(ticketId)
      .catch((error) => {
        error.statusCode = '400',
        error.message = 'Bad query parameters';
        throw error;
      })
      .then((ticket) => {
        if (!ticket) {
          const error = new Error();
          error.statusCode = 404;
          error.message = 'ticket not found';
          throw error;
        }

        Object.keys(req.body).forEach((key) => {
          console.log(key);
          ticket[key] = req.body[key];
        });

        if (req.body.image) {
          const mimeInfo = fileType(Buffer.from(image, 'base64'));
          ticket.image = {};
          ticket.image.data = image;
          ticket.image.content_type = mimeInfo.mime;
        }

        return ticket.save().catch((error) => {
          error.statusCode = 400;
          error.message = 'issue uploading image';
          throw error;
        });
      })
      .then((ticket) => {
        res.json(ticket).status(200);
      })
      .catch((error) => {
        console.log(error);
        res.json(error).status(error.statusCode || 500);
      });
};

const removeTicket = async (req, res) => {
  const ticketId = req.param.id;

  if (req.error) {
    res.json(req.error).status(req.error.statusCode || 500);
    return;
  }

  Ticket.findByIdAndRemove(ticketId)
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure while removing ticket';
        throw error;
      })
      .then((ticket) => {
        if (!ticket) {
          const error = new Error();
          error.statusCode = 404;
          error.message = 'ticket not found';
          throw error;
        }

        res.json({error: ''}).status(200);
      })
      .catch((error) => {
        res.json({error}).status(error.statusCode || 500);
      });
};

const getTicket = async (req, res) => {
  const ticketId = req.params.ticket_id;

  if (req.error) {
    res.json(req.error).status(req.error.statusCode || 500);
    return;
  }

  Ticket.findById(ticketId)
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure while finding ticket';
        console.log(error);
        throw error;
      })
      .then((ticket) => {
        if (!ticket) {
          const error = new Error();
          error.statusCode = 404;
          error.message = 'ticket not found';
          throw error;
        }
        res.json(ticket).status(200);
      })
      .catch((error) => {
        res.json({error}).status(error.statusCode || 500);
      });
};

const getTickets = async (req, res) => {
  let query = '';
  try {
    query = getTicketsQuery(req.query);
  } catch (e) {
    res.json({error: 'invalid input', error_message: e}).status(400);
    return;
  }

  const options = {};

  if (!req.error) {
    res.json(req.error).status(req.error.statusCode || 500);
    return;
  }

  if ((req.query.page || req.query.limit) !== undefined) {
    options.page = req.query.page || 1;
    options.limit = req.query.limit || 10;
  } else {
    options.paginate = false;
  }

  console.log(query);
  console.log(options);

  // For whatever reason, promises where not working.
  Ticket.paginate(query, options)
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure during find';
        throw error;
      })
      .then((tickets) => {
        if (!tickets) {
          res.json([]).status(200);
          return;
        }
        const min = Number(req.query.day_start) | 0;
        const max = Number(req.query.day_end) | 1440;

        tickets.docs = tickets.docs.filter((ticket) => {
          let d = new Date(ticket.createdAt);
          d = d.getHours() * 60 + d.getMinutes();
          return d >= min && d <=max;
        });


        res.json(tickets).status(200);
      })
      .catch((error) => {
        console.log('error' + error);
        res.json({error}).status(error.statusCode || 500);
      });
  /*
      .catch((error) => {
        console.log(error);
        error.statusCode = 500;
        error.message = 'server failure while retrieving tickets';
        throw error;
      })
      .catch((tickets) => {
        console.log(tickets);
        res.json(tickets).status(200);
      })
      .catch((error) => {
        console.log(error);
        res.json({error: error.message}).status(error.statusCode);
      });
  */
};

const getStatTickets = async (req, res) => {
  let query = '';
  try {
    query = getTicketsQuery(req.query);
  } catch (e) {
    res.json({error: 'invalid input', error_message: e}).status(400);
    return;
  }

  if (req.error) {
    res.json(req.error).status(req.error.statusCode || 500);
    return;
  }

  console.log(query);
  Ticket.find(query)
      .catch((error) => {
        error.statusCode = 400;
        error.message = 'Bad query syntax';
        throw error;
      })
      .then((tickets) => {
        const min = Number(req.query.day_start) | 0;
        const max = Number(req.query.day_end) | 1440;

        tickets = tickets.filter((ticket) => {
          let d = new Date(ticket.createdAt);
          d = d.getHours() * 60 + d.getMinutes();
          return d >= min && d <=max;
        });
        console.log(tickets);

        const response = {
          total_tickets: tickets.length,
          tickets_by_violation: {

          },
          tickets_by_location: {

          },
          tickets_by_status: {

          },
          min_date: new Date(8640000000000000),
          max_date: new Date(-8640000000000000),
        };

        const fun = (type, value) => {
          if (!response[type][value]) {
            response[type][value]=1;
          } else {
            response[type][value]++;
          }
        };

        tickets.forEach((ticket) => {
          console.log(ticket.violation);
          fun('tickets_by_violation', ticket.violation);
          fun('tickets_by_location', ticket.location);
          fun('tickets_by_status', ticket.status);
          response.min_date = Math.min(ticket.createdAt, response.min_date);
          response.max_date = Math.max(ticket.createdAt, response.max_date);
        });

        res.json(response).status(200);
      })
      .catch((error) => {
        console.log(error);
        res.json(error).status(error.statusCode || 500);
      });
};

const getEnums = async (req, res) => {
  console.log(Ticket.enumValues);
  res.status(200);
};

module.exports = {
  createTicket,
  updateTicket,
  removeTicket,
  getTickets,
  getTicket,
  getStatTickets,
  getEnums,
};
