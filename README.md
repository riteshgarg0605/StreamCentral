# StreamCentral

StreamCentral is a comprehensive backend project aimed at building a video hosting platform similar to YouTube. Developed with Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, and other tools, it supports essential features like user authentication, video uploads, likes, comments, subscriptions, and more. It follows best practices, utilizing JWT, bcrypt for security, and token-based authentication for access and refresh tokens.

## Important links

| Content           | Link                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| API Documentation | [Postman Documentation](https://documenter.getpostman.com/view/22903663/2sAXqtb23W) |
| Model Link        | [Eraser.io](https://app.eraser.io/workspace/ME1fTjkzV88KihKsnOny)                   |

## Table of Contents

1. [Key Features](#key-features)
2. [Technologies and Packages used](#technologies-and-packages-used)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Features](#features)
6. [Contributing](#contributing)
7. [Contact](#contact)

## Key Features

1. Health Check: Provides an endpoint to check the health status of the application.
2. User Management: Handles user-related operations such as registration, login, and profile management.
3. Video Management: Manages video uploads, retrieval, and related operations.
4. Comment System: Allows users to comment on videos.
5. Playlists: Enables users to create and manage playlists of videos.
6. Likes: Allows users to like videos.
7. Subscriptions: Manages user subscriptions to other users' channels.
8. Dashboard: Provides various statistics and data for the user dashboard.

## Technologies and Packages used

- [Node.js](https://nodejs.org/en)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Cloudinary](https://cloudinary.com/)
- [Postman](https://www.postman.com/)
- [jsonwebtoken (JWT)](https://www.npmjs.com/package/jsonwebtoken)
- [bcrypt](https://www.npmjs.com/package/bcrypt)
- [mongoose-aggregate-paginate-v2](https://www.npmjs.com/package/mongoose-aggregate-paginate-v2)
- [multer](https://www.npmjs.com/package/multer)

## Installation

Step-by-step instructions on how to set up your project locally:-

1. **Clone the repository:**

```bash
git clone https://github.com/riteshgarg0605/StreamCentral.git
```

2. **Navigate to the project directory:**

```bash
cd StreamCentral
```

3. **Install dependencies**

```bash
npm install
```

4. **Set up environment variables:** Create a '.env' file in root of project and fill in the required values using the '.env.sample' file

5. **Start the project**

```bash
npm run start
```

## Contributing

If you’d like to contribute, please fork the repository and use a feature branch. Pull requests are warmly welcome.

```bash
# Fork the repository
# Create your feature branch (`git checkout -b feature/fooBar`)
# Commit your changes (`git commit -am 'Add some fooBar'`)
# Push to the branch (`git push origin feature/fooBar`)
# Create a new Pull Request
```

## Contact

If you have any questions, feel free to contact me at [riteshgarg0605@gmail.com](mailto:riteshgarg0605@gmail.com).
