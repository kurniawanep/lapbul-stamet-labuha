<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'bmkgsoft' => [
        'username' => env('BMKGSOFT_USERNAME', '97460'),
        'password' => env('BMKGSOFT_PASSWORD', ''),
        'token' => env('BMKGSOFT_TOKEN', ''),
    ],

    'inasiam' => [
        'base_url' => env('INASIAM_BASE_URL', 'https://inasiam.bmkg.go.id'),
        'upt_id' => env('INASIAM_UPT_ID', '01KFJ17MQTAFJGACA017T6HV9K'),
        'apikey' => env('INASIAM_APIKEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM1NjY2MjksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.skLD2LUSGA8Vku5jB-v6qsYypGwD7zIG160JN4pOKU4'),
        'bearer_token' => env('INASIAM_BEARER_TOKEN', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNDlhZmI4Mi1iMmQ1LTQwZmQtOTVhMC05MzFkNTgyODIxYWIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg3NjQwNjIzLCJpYXQiOjE3ODcwMzU4MjMsImVtYWlsIjoic3RhbWV0Lm9lc21hbnNhZGlrQGJta2cuZ28uaWQiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6Imdvb2dsZSIsInByb3ZpZGVycyI6WyJnb29nbGUiXX0sInVzZXJfbWV0YWRhdGEiOnsiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pnbDgzSFB0cUVuWDdTT0lhUjVCc0NId0VWRFZwb095dv2u8jI1anFPeGh5TzRBPXM5Ni1jIiwicHJvdmlkZXJfaWQiOiIxMTA1NjE3MzczNzEzNjA2NDU0NjYiLCJzdWIiOiIxMTA1NjE3MzczNzEzNjA2NDU0NjYifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvYXV0aCIsInRpbWVzdGFtcCI6MTc4NzAzNTgyM31dLCJzZXNzaW9uX2lkIjoiOGZlMzFhYjItMTI3ZC00ZDcwLTg1OTAtM2E1YWQ0ODNiNTI2IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.LpNHHRLYnDtTczk2nqOm9hodVTXDiv3CALKwwTEYVMw'),
    ],

];
