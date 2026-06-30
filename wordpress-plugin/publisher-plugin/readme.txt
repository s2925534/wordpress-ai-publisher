=== Publisher Plugin ===
Contributors: pedro
Tags: publishing, wordpress, rest api
Requires at least: 6.4
Tested up to: 6.6
Stable tag: 0.1.1
License: MIT

Custom REST endpoints for the WordPress AI Publishing Assistant.

== Description ==
This plugin is a scaffold for the assistant's REST endpoints, token validation, and discovery helpers.

The plugin token is a shared secret copied from the app settings screen into the WordPress plugin settings. It authorizes requests to the custom REST endpoints.

== Installation ==
Copy the `publisher-plugin` folder into `wp-content/plugins/` and activate it.

== Settings ==
After activation, open `WordPress admin -> Settings -> Publisher Plugin` and paste the token generated in the app into the `Plugin token` field.
