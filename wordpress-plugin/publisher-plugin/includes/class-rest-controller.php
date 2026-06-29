<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Rest_Controller {
    private $auth;
    private $discovery;
    private $post_service;
    private $media_service;
    private $jetpack_service;

    public function __construct($auth) {
        $this->auth = $auth;
        $this->discovery = new Publisher_Site_Discovery();
        $this->post_service = new Publisher_Post_Service();
        $this->media_service = new Publisher_Media_Service();
        $this->jetpack_service = new Publisher_Jetpack_Service();
    }

    public function register_routes() {
        $namespace = apply_filters('publisher_plugin_route_namespace', 'publisher/v1');

        register_rest_route($namespace, '/site-info', array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_site_info'),
        ));

        register_rest_route($namespace, '/discovery', array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_discovery'),
        ));

        register_rest_route($namespace, '/jetpack/status', array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_jetpack_status'),
        ));

        register_rest_route($namespace, '/media', array(
            'methods' => WP_REST_Server::CREATABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_media_upload'),
        ));

        register_rest_route($namespace, '/posts', array(
            'methods' => WP_REST_Server::CREATABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_post_create'),
        ));
    }

    public function handle_site_info() {
        return rest_ensure_response($this->discovery->get_site_info());
    }

    public function handle_discovery() {
        return rest_ensure_response($this->discovery->get_discovery_payload());
    }

    public function handle_jetpack_status() {
        return rest_ensure_response($this->jetpack_service->get_status());
    }

    public function handle_media_upload(WP_REST_Request $request) {
        return rest_ensure_response($this->media_service->upload_media($request->get_json_params()));
    }

    public function handle_post_create(WP_REST_Request $request) {
        return rest_ensure_response($this->post_service->create_draft($request->get_json_params()));
    }
}
