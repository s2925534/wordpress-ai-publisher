<?php
/**
 * Plugin Name: Publisher Plugin
 * Description: Custom REST endpoints for the WordPress AI Publishing Assistant.
 * Version: 0.1.1
 * Author: Pedro Veloso
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PUBLISHER_PLUGIN_VERSION', '0.1.1');
define('PUBLISHER_PLUGIN_DIR', plugin_dir_path(__FILE__));

require_once PUBLISHER_PLUGIN_DIR . 'includes/class-auth.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-response.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-site-discovery.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-post-service.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-media-service.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-jetpack-service.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-settings-page.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-rest-controller.php';

function publisher_plugin_bootstrap() {
    $auth = new Publisher_Auth();
    $rest_controller = new Publisher_Rest_Controller($auth);
    $rest_controller->register_routes();
}

function publisher_plugin_admin_bootstrap() {
    $settings_page = new Publisher_Settings_Page();
    $settings_page->register_hooks();
}

add_action('rest_api_init', 'publisher_plugin_bootstrap');

if (is_admin()) {
    publisher_plugin_admin_bootstrap();
}
