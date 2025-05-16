from django.apps import AppConfig


class MainConfig(AppConfig):
    """
    Configuration class for the MAIN app.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'MAIN'
    verbose_name = 'Gestión Principal'
    
    def ready(self):
        """
        This method is called when Django starts.
        Import signals and other app-specific initialization code here.
        """
        # Import signals to register them
        import MAIN.signals  # noqa
