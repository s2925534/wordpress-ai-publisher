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

        register_rest_route($namespace, '/categories', array(
            array(
                'methods' => WP_REST_Server::READABLE,
                'permission_callback' => array($this->auth, 'validate_request'),
                'callback' => array($this, 'handle_categories'),
            ),
            array(
                'methods' => WP_REST_Server::CREATABLE,
                'permission_callback' => array($this->auth, 'validate_request'),
                'callback' => array($this, 'handle_create_category'),
            ),
        ));

        register_rest_route($namespace, '/tags', array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_tags'),
        ));

        register_rest_route($namespace, '/authors', array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_authors'),
        ));

        register_rest_route($namespace, '/recent-posts', array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_recent_posts'),
        ));

        register_rest_route($namespace, '/jetpack/status', array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_jetpack_status'),
        ));

        register_rest_route($namespace, '/jetpack/social-connections', array(
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_social_connections'),
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

        register_rest_route($namespace, '/posts/(?P<id>\d+)', array(
            'methods' => WP_REST_Server::EDITABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_post_update'),
        ));

        register_rest_route($namespace, '/posts/(?P<id>\d+)/publish', array(
            'methods' => WP_REST_Server::CREATABLE,
            'permission_callback' => array($this->auth, 'validate_request'),
            'callback' => array($this, 'handle_post_publish'),
        ));
    }

    public function handle_site_info() {
        return Publisher_Response::success($this->discovery->get_site_info());
    }

    public function handle_discovery() {
        return Publisher_Response::success($this->discovery->get_discovery_payload());
    }

    public function handle_categories() {
        if (!current_user_can('edit_posts')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to view categories.', 403);
        }

        return Publisher_Response::success(array('categories' => $this->discovery->get_categories()));
    }

    public function handle_create_category(WP_REST_Request $request) {
        if (!current_user_can('manage_categories')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to create categories.', 403);
        }

        $name = sanitize_text_field($request->get_param('name'));
        if (empty($name)) {
            return Publisher_Response::error('publisher_invalid_category', 'Category name is required.', 400);
        }

        $result = wp_insert_term($name, 'category', array(
            'slug' => sanitize_title($request->get_param('slug')),
        ));

        if (is_wp_error($result)) {
            return Publisher_Response::from_wp_error($result);
        }

        return Publisher_Response::success(array(
            'id' => intval($result['term_id']),
            'name' => $name,
        ), 201);
    }

    public function handle_tags() {
        if (!current_user_can('edit_posts')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to view tags.', 403);
        }

        return Publisher_Response::success(array('tags' => $this->discovery->get_tags()));
    }

    public function handle_authors() {
        if (!current_user_can('edit_posts')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to view authors.', 403);
        }

        return Publisher_Response::success(array('authors' => $this->discovery->get_authors()));
    }

    public function handle_recent_posts() {
        if (!current_user_can('edit_posts')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to view recent posts.', 403);
        }

        return Publisher_Response::success(array('recentPosts' => $this->discovery->get_recent_posts()));
    }

    public function handle_jetpack_status() {
        if (!current_user_can('edit_posts')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to view Jetpack status.', 403);
        }

        return Publisher_Response::success(array('jetpackStatus' => $this->jetpack_service->get_status()));
    }

    public function handle_social_connections() {
        if (!current_user_can('edit_posts')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to view social connections.', 403);
        }

        return Publisher_Response::success(array('socialConnections' => $this->jetpack_service->get_social_connections()));
    }

    public function handle_media_upload(WP_REST_Request $request) {
        if (!current_user_can('upload_files')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to upload media.', 403);
        }

        $result = $this->media_service->upload_media($request->get_json_params());
        if (is_wp_error($result)) {
            return Publisher_Response::from_wp_error($result);
        }
        return Publisher_Response::success($result, 201);
    }

    public function handle_post_create(WP_REST_Request $request) {
        if (!current_user_can('edit_posts')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to create posts.', 403);
        }

        $result = $this->post_service->create_draft($request->get_json_params());
        if (is_wp_error($result)) {
            return Publisher_Response::from_wp_error($result);
        }
        return Publisher_Response::success($result, 201);
    }

    public function handle_post_update(WP_REST_Request $request) {
        if (!current_user_can('edit_posts')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to update posts.', 403);
        }

        $result = $this->post_service->update_post($request['id'], $request->get_json_params());
        if (is_wp_error($result)) {
            return Publisher_Response::from_wp_error($result);
        }
        return Publisher_Response::success(array('updated' => true, 'result' => $result));
    }

    public function handle_post_publish(WP_REST_Request $request) {
        if (!current_user_can('publish_posts')) {
            return Publisher_Response::error('publisher_forbidden', 'Insufficient permissions to publish posts.', 403);
        }

        $result = $this->post_service->publish_post($request['id']);
        if (is_wp_error($result)) {
            return Publisher_Response::from_wp_error($result);
        }
        return Publisher_Response::success(array('published' => true, 'result' => $result));
    }
}
