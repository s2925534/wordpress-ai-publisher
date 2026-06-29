<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Response {
    public static function success($data = array(), $status = 200) {
        return new WP_REST_Response(
            array(
                'success' => true,
                'data' => $data,
                'error' => null,
            ),
            $status
        );
    }

    public static function error($code, $message, $status = 400, $details = array()) {
        return new WP_REST_Response(
            array(
                'success' => false,
                'data' => null,
                'error' => array(
                    'code' => $code,
                    'message' => $message,
                    'details' => $details,
                ),
            ),
            $status
        );
    }

    public static function from_wp_error($error) {
        if (!($error instanceof WP_Error)) {
            return self::error('publisher_unknown_error', 'Unknown error.');
        }

        $code = $error->get_error_code();
        $message = $error->get_error_message();
        $data = $error->get_error_data();
        $status = 400;

        if (is_array($data) && isset($data['status'])) {
            $status = intval($data['status']);
        }

        return self::error($code, $message, $status, is_array($data) ? $data : array());
    }
}
