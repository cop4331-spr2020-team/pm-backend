const fs = require('fs');
const User = require('../models/user');
const Ticket = require('../models/ticket');

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
      $gte: new Date(query.created_after),
      $lt: new Date(query.created_before),
    };
  } else if (query.created_after) {
    mongooseQuery.createdAt = {$gte: new Date(query.created_after)};
  } else if (query.created_before) {
    mongooseQuery.createdAt = {$lt: new Date(query.created_after)};
  }
  if (query.day_start) {
    // mongooseQuery['day_start'] = {},
  }
  if (query.day_end) {
    // mongooseQuery['day_end'] = {},
  }

  return mongooseQuery;
}

const createTicket = async (req, res) => {

  if (req.error) {
    res.json(req.error).status(req.error.statusCode);
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
  } = req.body;

  let image = '';
  if (req.image) {
    image = readImage(req.image.path);
  }

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
          violationType: violation,
          licensePlate: license_plate,
          description: description,
          location: location,
          additionalComments: additional_comments,
          image: image,
          _userId: user._id,
        });

        return ticket.save()
            .catch((error) => {
              error.statusCode = 500;
              error.message = 'Unable to store ticket';
              console.log(error);
              throw error;
            });
      })
      .then((ticket) => {
        res.json({ticket_id: ticket._id, error: ''}).status(200);
      })
      .catch((error) => {
        res.json({error}).status(error.statusCode);
      });
};

const updateTicket = async (req, res) => {
  const ticketId = req.param.id;

  if (req.error) {
    res.json(req.error).status(req.error.statusCode);
    return;
  }

  if (req.image) {
    req.image = readImage(req.image.path);
  }

  const update = Object.assign(req.body, req.image);
  const opts = {
    runValidators: true,
  };

  console.log(update);

  Ticket.updateOne({_id: ticketId}, update, opts)
      .catch((error) => {
        error.statusCode = '400',
        error.message = 'Bad query parameters';
        throw error;
      })
      .then(() => {
        res.json({error: ''}).status(200);
      })
      .catch((error) => {
        res.json(error).status(error.statusCode);
      });
};

const removeTicket = async (req, res) => {
  const ticketId = req.param.id;

  if (req.error) {
    res.json(req.error).status(req.error.statusCode);
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
        res.json({error}).status(error.statusCode);
      });
};

const getTicket = async (req, res) => {
  const ticketId = req.params.ticket_id;

  if (req.error) {
    res.json(req.error).status(req.error.statusCode);
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
        res.json({error}).status(error.statusCode);
      });
};

const getTickets = async (req, res) => {
  const query = getTicketsQuery(req.query);
  const options = {};

  if (req.error) {
    res.json(req.error).status(req.error.statusCode);
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
        console.log(tickets);
        res.json(tickets).status(200);
      })
      .catch((error) => {
        res.json({error}).status(error.statusCode);
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
  const query = getTicketsQuery(req.query);

  if (req.error) {
    res.json(req.error).status(req.error.statusCode);
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
          console.log(ticket.violationType);
          fun('tickets_by_violation', ticket.violationType);
          fun('tickets_by_location', ticket.location);
          fun('tickets_by_status', ticket.status);
          response.min_date = Math.min(ticket.createdAt, response.min_date);
          response.max_date = Math.max(ticket.createdAt, response.max_date);
        });

        res.json(response).status(200);
      })
      .catch((error) => {
        res.json(error).status(error.statusCode);
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
