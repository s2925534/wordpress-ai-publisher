<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Site_Discovery {
    public function get_site_info() {
        return array(
            'siteName' => get_bloginfo('name'),
            'siteUrl' => home_url(),
            'timezone' => wp_timezone_string(),
            'locale' => determine_locale(),
        );
    }

    public function get_discovery_payload() {
        return array(
            'siteInfo' => $this->get_site_info(),
            'restApiAvailable' => true,
            'canCreatePosts' => current_user_can('edit_posts'),
            'canPublishPosts' => current_user_can('publish_posts'),
            'canUploadMedia' => current_user_can('upload_files'),
        );
    }
}
