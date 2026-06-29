<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Post_Service {
    public function create_draft($payload) {
        return array(
            'success' => false,
            'message' => 'Post creation is scaffolded in Phase 2.',
            'payload' => $payload,
        );
    }
}
