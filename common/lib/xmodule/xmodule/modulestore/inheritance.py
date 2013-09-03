from xblock.core import Scope
from xblock.runtime import KeyValueStore

# A list of metadata that this module can inherit from its parent module
INHERITABLE_METADATA = (
    'graded', 'start', 'due', 'graceperiod', 'showanswer', 'rerandomize',
    # TODO (ichuang): used for Fall 2012 xqa server access
    'xqa_key',
    # How many days early to show a course element to beta testers (float)
    # intended to be set per-course, but can be overridden in for specific
    # elements.  Can be a float.
    'days_early_for_beta',
    'giturl',  # for git edit link
    'static_asset_path',  # for static assets placed outside xcontent contentstore
)


def compute_inherited_metadata(descriptor):
    """Given a descriptor, traverse all of its descendants and do metadata
    inheritance.  Should be called on a CourseDescriptor after importing a
    course.

    NOTE: This means that there is no such thing as lazy loading at the
    moment--this accesses all the children."""
    # compute the values to be inherited by the children
    try:
        parent_metadata = descriptor.xblock_kvs.inherited_settings.copy()
    except AttributeError:
        # the descriptor does not have a kvs or inherited_settings; so, cannot participate
        return
    if descriptor.has_children:
        # add any of descriptor's explicitly set fields to the inheriting list
        for field in INHERITABLE_METADATA:
            # pylint: disable = W0212
            if descriptor._model_data.has(field):
                parent_metadata[field] = descriptor._model_data.get(field)

        for child in descriptor.get_children():
            inherit_metadata(child, parent_metadata)
            compute_inherited_metadata(child)


def inherit_metadata(descriptor, inherited_data):
    """
    Updates this module with metadata inherited from a containing module.
    Only metadata specified in self.inheritable_metadata will
    be inherited

    `inherited_data`: A dictionary mapping field names to the values that
        they should inherit
    """
    try:
        descriptor.xblock_kvs.inherited_settings = inherited_data
    except AttributeError:
        # should only occur on error descriptors, but if it occurs, the element cannot handle inheritance
        pass

def own_metadata(module):
    """
    Return a dictionary that contains only non-inherited field keys,
    mapped to their values
    """
    return module.get_explicitly_set_fields_by_scope(Scope.settings)

class InheritanceKeyValueStore(KeyValueStore):
    """
    Common superclass for kvs's which know about inheritance of settings. Offers simple
    dict-based storage of fields and lookup of inherited values.
    """
    def __init__(self, initial_values=None, inherited_settings=None):
        super(InheritanceKeyValueStore, self).__init__()
        self.inherited_settings = inherited_settings or {}
        self._fields = initial_values or {}

    def get(self, key):
        return self._fields[key.field_name]

    def set(self, key, value):
        # xml backed courses are read-only, but they do have some computed fields
        self._fields[key.field_name] = value

    def delete(self, key):
        del self._fields[key.field_name]

    def has(self, key):
        return key.field_name in self._fields

    def default(self, key):
        """
        Check to see if the default should be from inheritance rather than from the field's global default
        """
        if key.field_name in self.inherited_settings:
            return self.inherited_settings[key.field_name]
        else:
            raise KeyError()
