Feature: Static Pages
    As a course author, I want to be able to add static pages

    Scenario: Users can add static pages
        Given I have opened a new course in Studio
        And I go to the static pages page
        When I add a new page
        Then I should see a "Empty" static page

    Scenario: Users can delete static pages
        Given I have opened a new course in Studio
        And I go to the static pages page
        And I add a new page
        And I "delete" the "Empty" page
        Then I am shown a prompt
        When I confirm the prompt
        Then I should not see a "Empty" static page

    # Safari won't update the name properly
    @skip_safari
    Scenario: Users can edit static pages
        Given I have opened a new course in Studio
        And I go to the static pages page
        And I add a new page
        When I "edit" the "Empty" page
        And I change the name to "New"
        Then I should see a "New" static page
