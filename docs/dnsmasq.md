# dnsmasq

```
$ brew install dnsmasq
$ echo 'address=/.test/127.0.0.1' > $(brew --prefix)/etc/dnsmasq.conf
$ sudo mkdir /etc/resolver
$ sudo bash -c 'echo "nameserver 127.0.0.1" > /etc/resolver/test'
$ sudo brew services start dnsmasq
```
