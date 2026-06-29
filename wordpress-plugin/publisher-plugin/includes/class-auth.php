<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Auth {
    public function validate_request(WP_REST_Request $request) {
        $token = $request->get_header('x-publisher-token');
        $expected = get_option('publisher_plugin_token', '');

        if (empty($expected) || empty($token) || !hash_equals($expected, $token)) {
            return new WP_Error('publisher_forbidden', 'Invalid publisher token.', array('status' => 403));
        }

        return true;
    }
}
