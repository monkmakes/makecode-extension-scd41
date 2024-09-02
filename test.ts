input.onButtonPressed(Button.A, function () {
    basic.showNumber(SCD41.get_temperature())
})
input.onButtonPressed(Button.B, function () {
    basic.showNumber(SCD41.get_relative_humidity())
})
SCD41.set_altitude(0)
loops.everyInterval(5000, function () {
    basic.showNumber(SCD41.get_co2())
})