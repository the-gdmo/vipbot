VIP Bot is an app that lets you easily highlight content from important users in your subreddit and also allows a minimum account age and message for users to be able to post on your subreddit.

The app gets triggered when a comment is posted or edited, or a post is created.

You can also set an optional post flair if important users respond to the post.

## Limitations

* For flair setting options, if you specify both a CSS class and a flair template, the flair template will be used.

## Suggestions

I recommend testing settings out on a test subreddit before deploying to a real subreddit for the first time.

## Supported Placeholders
* `{{author}}`: The username of the poster. Will not contain 'u/'.
* `{{userPage}}`: Link to a page that lets a user know exactly when they will be unbanned.
* `{{minimum}}`: The minimum age of an account before they are allowed to make posts.
* `{{permalink}}`: Link to the most recent post by the poster.
* `{{title}}`: The title of the most recent valid post by the poster.
* `{{subreddit}}`: Get the name of the subreddit. Will not contain 'r/'.

## Data Stored

This application stores how old each user's account is in a Redis data store (when using the account restriction feature). It also stores a record that a comment has been pinned by it.

If the application is removed from a subreddit, all data is deleted although the flairs will remain. No data will be restored if the application is subsequently re-installed.

## Acknowledgements

I have received help in the past from [**u/fsv**](https://reddit.com/u/fsv) and [**u/beach-brews**](https://reddit.com/u/beach-brews) with RepBot

[Code edited from my RepBot project](https://github.com/the-gdmo/TheRepBot).

## About

This app is open source and licensed under the BSD 3-Clause License. You can find the source code on GitHub [here](https://github.com/the-gdmo/vipbot).

NOTE: If you remove the app from your subreddit, it will delete all data and you will have to manually restore any related data to users. 

## Version History
### 0.0.2
* Simplify README as much as possible
* Change messaging logic to link to my developer instead of a separate subreddit
### 0.0.1
* Import [RepBot](https://github.com/the-gdmo/TheRepBot) code
* Create VIPBot
* Upload app image