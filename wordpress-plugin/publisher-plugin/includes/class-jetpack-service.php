<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Jetpack_Service {
    public function get_status() {
        return array(
            'installed' => defined('JETPACK__VERSION'),
            'active' => class_exists('Jetpack'),
            'connected' => false,
            'socialAvailable' => false,
        );
    }

    public function get_social_connections() {
        if (!$this->get_status()['installed']) {
            return array();
        }

        return array();
    }
}
