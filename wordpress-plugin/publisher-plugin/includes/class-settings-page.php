<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Settings_Page {
    public function register_hooks() {
        add_action('admin_menu', array($this, 'register_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }

    public function register_menu() {
        add_options_page(
            'Publisher Plugin',
            'Publisher Plugin',
            'manage_options',
            'publisher-plugin',
            array($this, 'render_page')
        );
    }

    public function register_settings() {
        register_setting(
            'publisher_plugin_settings_group',
            'publisher_plugin_token',
            array(
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'default' => '',
            )
        );
    }

    public function render_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $token = get_option('publisher_plugin_token', '');
        ?>
        <div class="wrap">
            <h1>Publisher Plugin</h1>
            <p>
                Paste the plugin token generated in the app. The plugin uses this value to validate
                requests from the app via the <code>X-Publisher-Token</code> header.
            </p>
            <form method="post" action="options.php">
                <?php settings_fields('publisher_plugin_settings_group'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="publisher_plugin_token">Plugin token</label>
                        </th>
                        <td>
                            <input
                                name="publisher_plugin_token"
                                id="publisher_plugin_token"
                                type="text"
                                class="regular-text code"
                                value="<?php echo esc_attr($token); ?>"
                                autocomplete="off"
                            />
                            <p class="description">
                                Copy the token from the app's Settings screen, or open the app's
                                prefilled settings link, then save it here.
                            </p>
                            <p
                                id="publisher_plugin_prefill_notice"
                                class="description"
                                style="display:none;"
                            >
                                Token prefilled from the app. Click Save Plugin Token to store it.
                            </p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Save Plugin Token'); ?>
            </form>
        </div>
        <script>
            (function () {
                var hash = window.location.hash ? window.location.hash.slice(1) : '';
                if (!hash) {
                    return;
                }

                var params = new URLSearchParams(hash);
                var token = params.get('publisher_plugin_token');
                var input = document.getElementById('publisher_plugin_token');
                var notice = document.getElementById('publisher_plugin_prefill_notice');

                if (!token || !input) {
                    return;
                }

                input.value = token;

                if (notice) {
                    notice.style.display = 'block';
                }
            })();
        </script>
        <?php
    }
}
