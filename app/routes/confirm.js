const express = require('express');
const router = new express.Router();

router.get('/', (req, res) => {
  console.log(req.query);
  const token = req.query.token;
  if (!token) {
    res.json({error: 'missing token'}).sendStatus(400);
    return;
  }
  res.send(`
    <html>
        <body>
            <form action="/auth/signup/confirm" method="post" id="tokenForm">
                <label for="email">Email:</label>
                <input type="text" name="email" id="email">
                <input type="hidden" name="token" id="token" value="${token}">
                <input type="button" onclick="verify()" value="Submit">
            </form>
            <label id="statusLabel"></label>
        </body>
        <script>
            function verify() {
                const email = document.getElementById("email").value;
                const token = document.getElementById("token").value;

                const body = {
                    email: email,
                    token: token,
                };

                fetch('/auth/signup/confirm', {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    redirect: 'follow',
                    body: JSON.stringify(body)
                })
                .then((response) => {
                    const statusLabel = document.getElementById("statusLabel")
                    if (response.status == 200) {
                        statusLabel.innerHTML = "Verification Success!";
                    } else {
                        statusLabel.innerHTML = "Verification Failed!";
                    }
                })
                .catch((error) => {
                    console.log(error);
                });
            }
        </script>
    </html>
  `);
});

module.exports = {
  router,
};
