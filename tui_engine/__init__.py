from .styles.academic import AcademicStyle
from .styles.clinical import ClinicalStyle
from .styles.minimal import MinimalStyle
from .styles.modern import ModernStyle

__all__ = [
    "AcademicStyle",
    "ModernStyle",
    "MinimalStyle",
    "ClinicalStyle",
]

STYLES = {
    "academic": AcademicStyle,
    "modern": ModernStyle,
    "minimal": MinimalStyle,
    "clinical": ClinicalStyle,
}
