# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e9]:
        - generic [ref=e10]:
            - img [ref=e13]
            - heading "SECURE ACCESS" [level=3] [ref=e15]
            - paragraph [ref=e16]: Enter credentials to unlock MoneyWise
            - generic [ref=e17]:
                - generic [ref=e20]: SYSTEM ONLINE
                - generic [ref=e21]:
                    - img [ref=e22]
                    - generic [ref=e26]: ENCRYPTED
        - generic [ref=e27]:
            - generic [ref=e28]:
                - generic [ref=e29]:
                    - generic [ref=e30]:
                        - img [ref=e31]
                        - text: Access ID
                    - textbox "Access ID" [ref=e35]
                - generic [ref=e36]:
                    - generic [ref=e37]:
                        - img [ref=e38]
                        - text: Security Key
                    - generic [ref=e41]:
                        - textbox "Security Key" [ref=e42]
                        - button "Toggle password visibility" [ref=e43] [cursor=pointer]:
                            - img [ref=e44] [cursor=pointer]
                - button "AUTHENTICATE" [ref=e47] [cursor=pointer]:
                    - generic [ref=e48] [cursor=pointer]:
                        - img [ref=e49] [cursor=pointer]
                        - text: AUTHENTICATE
                        - img [ref=e51] [cursor=pointer]
            - paragraph [ref=e54]:
                - text: Need access credentials?
                - button "Request Access" [ref=e55] [cursor=pointer]
    - region "Notifications alt+T"
    - alert [ref=e58]
```
