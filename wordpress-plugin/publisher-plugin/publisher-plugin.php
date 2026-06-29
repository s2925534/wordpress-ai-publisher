<?php
/**
 * Plugin Name: Publisher Plugin
 * Description: Custom REST endpoints for the WordPress AI Publishing Assistant.
 * Version: 0.1.0
 * Author: Pedro Veloso
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PUBLISHER_PLUGIN_VERSION', '0.1.0');
define('PUBLISHER_PLUGIN_DIR', plugin_dir_path(__FILE__));

require_once PUBLISHER_PLUGIN_DIR . 'includes/class-auth.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-site-discovery.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-post-service.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-media-service.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-jetpack-service.php';
require_once PUBLISHER_PLUGIN_DIR . 'includes/class-rest-controller.php';

function publisher_plugin_bootstrap() {
    $auth = new Publisher_Auth();
    $rest_controller = new Publisher_Rest_Controller($auth);
    $rest_controller->register_routes();
}

add_action('rest_api_init', 'publisher_plugin_bootstrap');
