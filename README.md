# Under Developement 

# VidHub Central
This is the repo for my final project for Info344 - Server Side Web Developement. The purpose of this assignment is to create and deploy a fully functional web app.

## The Project
### Purpose
VidHub Central is a video/live-stream service that allows people to link their YouTube and Twitch.tv accounts and see the most recent videos/live-streams they haven't watched yet. Users can also favorite content creators to get easier access to their content as well as organize creators into categories to make it easier to find them later.

The whole point is to make it so users don't have to go to and navigate multiple sites just to keep up with their video watching services.

### Technical
This app was developed using the MEAN stack and deployed on an AWS instance running ubuntu.

## API Endpoints (Unofficial)
```
* - Requires Authentication
```

### User Authorization / Account Information
* `POST /api/login` - Logs a user in
* `GET /api/login` - Gets a logged in users account information
* `GET /api/logout` - Logs a user out
* `POST /api/users/` - Adds a new user
* *`POST /api/users/[userID]/addusername` - Adds an external account username to the current account
* *`GET /api/auth/youtube` - Authorizes users YouTube account to be used with this account (redirects to YouTube)

### Channel Information
* *`GET /api/refresh` - Refreshes all channels/activities to current information
* *`GET /api/channels` - Lists all of a users followed/subscribed channels
* *`GET /api/channels/[channelID]` - Lists a channels details

### Tag Information
* *`GET /api/tags` - Lists all of a users tags
* *`POST /api/tags` - Adds a new tag
* *`GET /api/tags/[tagID]` - Lists all of the information pertaining to a particular tag

### Favorites Information
* *`GET /api/favorites` - Lists all of a users favorites
