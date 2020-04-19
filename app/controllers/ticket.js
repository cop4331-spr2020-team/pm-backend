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

  if (query.user_ids) {
    mongooseQuery._ids = {$in: query.user_ids};
  }
  if (query.created_after && query.created_before) {
    mongooseQuery.createdAt = {
      $gte: new Date(created_after),
      $lt: new Date(created_before),
    };
  } else if (query.created_after) {
    mongooseQuery.createdAt = {$gte: new Date(created_after)};
  } else if (query.created_before) {
    mongooseQuery.createdAt = {$lt: new Date(created_after)};
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
  const {
    // eslint-disable-next-line camelcase
    violation_type,
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
          violationType: violation_type,
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
        res.json({error: error.message}).status(error.statusCode);
      });
};

const updateTicket = async (req, res) => {
  const ticketId = req.param.id;

  if (req.image) {
    req.image = readImage(req.image.path);
  }

  const update = Object.assign(req.body, req.image);
  const opts = {
    runValidators: true,
  };


  Ticket.updateOne({_id: ticketId}, update, opts)
      .catch((error) => {
        error.statusCode = '404',
        error.message = 'Could not find ticket';
        throw error;
      })
      .then(() => {
        res.json({error: ''}).status(200);
      })
      .catch((error) => {
        res.json({error: error.message}).status(error.statusCode);
      });
};

const removeTicket = async (req, res) => {
  const ticketId = req.param.id;
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
        res.json({error: error.message}).status(error.statusCode);
      });
};

const getTicket = async (req, res) => {
  const ticketId = req.params.ticket_id;
  Ticket.findById(ticketId)
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure while finding ticket';
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
        res.json({error: error.message}).status(error.statusCode);
      });
};

const getTickets = async (req, res) => {
  const query = getTicketsQuery(req.query);

  const options = {
    paginate: !req.query.page && !req.query.limit,
    page: req.query.page || 1,
    limit: req.query.limit || 10,
  };

  Ticket.paginate(query, options)
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure while retrieving tickets';
        throw error;
      })
      .catch((tickets) => {
        res.json(tickets).status(200);
      })
      .catch((error) => {
        res.json({error: error.message}).status(error.statusCode);
      });
};

const getStatTickets = async (req, res) => {
  const query = getTicketsQuery(req.query);

  Ticket.find(query)
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure while retrieving tickets';
        throw error;
      })
      .catch((tickets) => {
        if (!tickets) {
          return res.json([]).status(200);
        }

        const response = {
          total_tickets: tickets.length,
          tickets_by_violation: {

          },
          tickets_by_location: {

          },
          tickets_by_status: {

          },
        };

        totalNumberOfTickets.forEach((ticket) => {
          const fun = (type, value) => {
            if (!response[type][value]) {
              response[type][value]=0;
            } else {
              response[type][value]++;
            }
          };

          fun('tickets_by_violation', ticket.violationType);
          fun('tickets_by_location', ticket.location);
          fun('tickets_by_status', ticket.status);
        });

        res.json(response).status(200);
      })
      .catch((error) => {
        res.json({error: error.message}).status(error.statusCode);
      });
};

module.exports = {
  createTicket,
  updateTicket,
  removeTicket,
  getTickets,
  getTicket,
  getStatTickets,
};
