
/**
 * Asynchronous login, assigning jwt for further API calls.
 * Fails if user is not verified.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const login = async (req, res) => {

};

/**
 * Asynchronous logout, invalidating jwt passed in req.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const logout = async (req, res) => {

};

/**
 * Asynchronous sign up for user, with awaiting verification.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const signup = async (req, res) => {

};

/**
 * Verifies user in DB.
 * @param {Object} req - request object 
 * @param {Object} res - response object 
 */
const confirm = async (req, res) => {

};

/**
 * Sends reset token to user email, allowing future changePassword without jwt.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const reset = async (req, res) => {

};

/**
 * Changes a user's password using a reset token, or jwt.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const changePassword = async (req, res) => {

};

module.exports = {
    login,
    logout,
    signup,
    confirm,
    reset,
    changePassword
}